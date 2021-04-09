
const { GraphQLObjectType } = require('graphql');
const fetch = require(`node-fetch`);
const { default: PQueue } = require(`p-queue`);
const { join } = require('path');
const path = require(`path`);
const { URL } = require(`url`);
const createTemplateChooser = require(`./utils/createTemplateChooser`);


const syncQuery = `
query Sync(
    $limit: Int!,
    $offset: Int!,
    $since: Int!,
    $stage: VersionedStage!
) {
    sync (limit: $limit, offset: $offset, since: $since, stage: $stage)
}
`;

let __typename = type => type;
let __ssTypes = [];
let __fetch;

class HTTPResponseError extends Error {
	constructor(response, ...args) {
		super(`HTTP Error Response: ${response.status} ${response.statusText}`, ...args);
        this.response = response;
	}
}

const checkStatus = response => {
	if (response.ok) {
		// response.status >= 200 && response.status < 300
		return response;
	} else {
        console.log(response);
		throw new HTTPResponseError(response);
	}
}


const createFetch = (endpoint, apiKey) => async (query, variables = {}) => {
    const response = await fetch(
        endpoint,
        {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                'X-API-KEY': apiKey,
            },
            body: JSON.stringify({
                query,
                variables,
            })
        }
    );
    try {
        checkStatus(response);
    } catch (error) {
        console.log(error);
	    const errorBody = await error.response.text();
	    throw new Error(errorBody);
    }
    const data = await response.json();

    return data;
};

exports.onPreBootstrap = (_, pluginConfig) => {
    const { typePrefix, graphqlEndpoint, baseUrl, apiKey } = pluginConfig;
    __typename = (type) => `${typePrefix}${type}`;

    const endpoint = new URL(graphqlEndpoint, baseUrl).toString();
    __fetch = createFetch(endpoint, apiKey);
};

exports.sourceNodes = async (
    {
        actions,
        createContentDigest,
        reporter,
        cache,
        getNodesByType,
    },
    pluginConfig
) => {  
    const { createNode, deleteNode, touchNode } = actions

    const process = (results) => {
        results.updates.forEach(result => {       
            const [typeName, typeID] = result.typeAncestry[0];            
            const nodeData = {
                ...result,
                id: typeID,
                internal: {
                    type: __typename(typeName),
                    contentDigest: createContentDigest(result),                    
                }
            }
            createNode(nodeData) 
        });
        results.deletes.forEach(nodeId => deleteNode(nodeId));
    };

    const { batchSize, stage } = pluginConfig;
    let offset = 0;
    
    reporter.info(`Beginning Silverstripe CMS fetch in batches of ${batchSize}`);
    
    const timestamp = await cache.get(`lastFetch`) ?? 0;
    if (timestamp) {
        const date = new Date(timestamp);
        reporter.info(`Delta fetching since [${date}]`);

        // Ensure existing nodes aren't garbage collected
        __ssTypes.forEach(typeName => {
            getNodesByType(typeName).forEach(touchNode);
        });    
    } else {
        reporter.info(`This is a full content fetch. It may take a while...`);        
    }
    const variables = {
        limit: batchSize,
        offset,
        since: timestamp,
        stage,
    };
    
    const data = await __fetch(syncQuery, variables);
    
    if (data.errors && data.errors.length) {
        reporter.panic(`Silverstripe CMS source plugin could not fetch. Errors: `, data.errors);
    }
    
    const { data: { sync: { totalCount, results } } } = data;
    
    reporter.info(`Found ${totalCount} nodes to sync.`);
    
    process(results);
    
    if (totalCount > batchSize) {
        let remaining = totalCount - batchSize;
        const numberOfBatches = Math.ceil(remaining / batchSize);
        const { concurrentRequests } = pluginConfig;
        
        reporter.info(`Multiple fetches required. Using concurrency of ${concurrentRequests}  for ${numberOfBatches} remaining fetches.`);
        
        const queue = new PQueue({concurrency: concurrentRequests});
        const pages = [...Array(Math.floor(numberOfBatches/2)).keys()];
        
        pages.forEach(pageNumber => {
            queue.add(async () => {
                const response = await __fetch(syncQuery, {
                    ...variables,
                    offset: pageNumber * batchSize,
                });
                const { data: { sync:  { results } } } = response;
                process(results);
                Promise.resolve();
            });            
            remaining -= batchSize;
        });
        
        let count = 0;
        
        const activity = reporter.activityTimer(`Fetching from Silverstripe CMS GraphQL API:`);
        activity.start();
        
        queue.on(`active`, () => {
            count++;
            const pct = Math.ceil((count/numberOfBatches) * 100);
            activity.setStatus(`[${pct}%] (${numberOfBatches - count} batches remaining)`)
        });
        await queue.onIdle();
        activity.setStatus(`[100%] (0 batches remaining)`)
        activity.end();

    }
};

exports.pluginOptionsSchema = ({ Joi }) => {
    return Joi.object({
        baseUrl: Joi.string().uri().required().description(`
            The absolute base URL to your Silverstripe CMS installation, excluding the graphql suburl,
            e.g. https://mywebsite.com
        `),
        graphqlEndpoint: Joi.string()
            .default(`__gatsby/graphql`)
            .description(`
            The pathname to your gatsby graphql server endpoint, e.g. __gatsby/graphql
        `),
        apiKey: Joi.string()
            .required()
            .description(`
                The API key from your Silverstripe CMS member. Find this in the Security section, on 
                the "Api keys" tab for the member you want to use for authentication (should be an administrator)
            `),
        batchSize: Joi.number()
            .integer()
            .max(1000)
            .min(1)
            .default(100),
        concurrentRequests: Joi.number()
            .integer()
            .max(20)
            .min(1)
            .default(5),
        typePrefix: Joi.string()
            .default('SS_'),
        stage: Joi.string()
            .valid('DRAFT', 'LIVE')
            .default('DRAFT'),
        
  })
};

exports.createSchemaCustomization = async ({ actions }, pluginConfig) => {
    const { createTypes } = actions;
    const prefix = pluginConfig.typePrefix;

    const query = `
        query { schema(prefix: "${prefix}" ) }
    `;
    const result = await __fetch(query);
    const { data: { schema: { schema, types } } } = result;
    __ssTypes = types;
    createTypes(schema);
};

exports.createResolvers = ({ createResolvers, intermediateSchema }) => {
    
    const resolvers = {};
    
    __ssTypes.forEach(typeName => {
        const type = intermediateSchema.getType(typeName);
        if (!type || type.constructor.name !== 'GraphQLObjectType') {
            return;
        }
        const allFields = type.getFields();
        const fieldNames = Object.keys(allFields);
        const fieldResolvers = {};
        fieldNames.forEach(fieldName => {
            const field = allFields[fieldName];
            const fullType = field.type.toString();
            const namedType = fullType.replace(/[^A-Za-z0-9_]+/g, '');
            const isList = fullType.startsWith(`[`);
            if (namedType && __ssTypes.includes(namedType)) {
                const namedTypeToFetch = namedType.replace(/InheritanceUnion$/, 'Interface');
                if (isList) {
                    fieldResolvers[field.name] = {
                        resolve(source, args, context, info) {
                            if (!Array.isArray(source[field.name])) {
                                return null;
                            }
                            const ids = source[field.name].map(o => o.id);
                            return context.nodeModel.getNodesByIds({
                                ids,
                                type: namedTypeToFetch,
                            })
                        }
                    };
                } else {
                    fieldResolvers[field.name] = {                        
                        resolve(source, args, context, info) {
                            if (!source[field.name].id) {
                                return null;
                            }
                            return context.nodeModel.getNodeById({
                                id: source[field.name].id,
                                type: namedTypeToFetch,
                            })
                        }
                    };
                }
            }
        })
        resolvers[type.name] = fieldResolvers;
    });
    createResolvers(resolvers);
}



exports.onPostBuild = async ({ cache }) => {
    await cache.set(`lastFetch`, Math.floor(Date.now() / 1000))
};  

exports.createPages = async ({ graphql, actions, reporter }, pluginConfig) => {
    const prefix = pluginConfig.typePrefix;
    const chooseTemplate = createTemplateChooser([`src/templates`], prefix);
    const result = await graphql(`
    query {
        allSsSiteTreeInterface {
            nodes {
                id
                link
                typeAncestry
                internal {
                    type
                }
            }
        }
    }
    `);

  result.data.allSsSiteTreeInterface.nodes.forEach(node => {
    const component = chooseTemplate(node);
    console.log(`chose component ${component} for ${node.internal.type}`);
    if (!component) {
        reporter.warn(`No template found for node ${node.internal.type}. Skipping`);
        return;
    }
    actions.createPage({
      path: node.link,
      component,
      context: {
        id: node.id
      },
    })
  })
};