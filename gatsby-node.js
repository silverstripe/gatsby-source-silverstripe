
const { GraphQLObjectType } = require('graphql');
const fetch = require(`node-fetch`);
const { default: PQueue } = require(`p-queue`);
const { join } = require('path');
const path = require(`path`);
const { URL } = require(`url`);
const createTemplateChooser = require(`./utils/createTemplateChooser`);
const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

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
let __fetch;

const __stateCache = {
    types: [],
    files: [],
    schema: null,    
};


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

exports.onPreBootstrap = async ({ cache }, pluginConfig) => {
    const { typePrefix, graphqlEndpoint, baseUrl, apiKey } = pluginConfig;
    __typename = (type) => `${typePrefix}${type}`;

    const endpoint = new URL(graphqlEndpoint, baseUrl).toString();
    __fetch = createFetch(endpoint, apiKey);

    const query = `
        query { schema(prefix: "${typePrefix}" ) }
    `;
    const result = await __fetch(query);
    const { data: { schema: { schema, types, files } } } = result;
    __stateCache.schema = schema;
    __stateCache.types = types;
    __stateCache.files = files;
};

exports.sourceNodes = async (
    {
        actions,
        createContentDigest,
        reporter,
        cache,
        getNodesByType,  
        getNode,
        getCache,
        createNodeId
    },
    pluginConfig
) => {  
    const { createNode, deleteNode, touchNode } = actions

    const process = async (results) => {
        for (const result of results.updates) {       
            const [typeName, typeID] = result.typeAncestry[0];            
            const nodeData = {
                ...result,
                id: typeID,
                internal: {
                    type: __typename(typeName),
                    contentDigest: createContentDigest(result),                    
                }
            }
            const isFile = result.typeAncestry.some(a => a[0] === `File`);
            if (isFile) {
                const url = result.absoluteLink;
                if (!url) {
                    reporter.warn(`Silverstripe file has no URL. Skipping: ${JSON.stringify(result)}`);
                } else {
                    delete result.link;
                    delete result.absoluteLink;
                    
                    const attachedFileID = createNodeId(`${nodeData.id}--${url}`);
                    nodeData.localFile = { id: attachedFileID };
                    createNode(nodeData);

                    createRemoteFileNode({
                        url,
                        parentNodeId: nodeData.id,
                        getCache,
                        createNode,
                        createNodeId() {
                            return attachedFileID;
                        },
                        httpHeaders: { 'X-API-KEY': pluginConfig.apiKey, },

                    });
                }
            } else {
                createNode(nodeData);                 
            }

        }
        results.deletes.forEach(nodeId => {
            deleteNode(getNode(nodeId));
        });
    };

    const { batchSize, stage, forceRefresh } = pluginConfig;
    let offset = 0;
    
    reporter.info(`Beginning Silverstripe CMS fetch in batches of ${batchSize}`);
    
    let timestamp = 0;
    if (!forceRefresh) {
        timestamp = await cache.get(`lastFetch`) ?? 0;
    }
    if (timestamp > 0) {
        const date = new Date(timestamp * 1000);
        reporter.info(`Delta fetching since [${date}]`);

        // Ensure existing nodes aren't garbage collected
        __stateCache.types.forEach(typeName => {
            getNodesByType(typeName).forEach(node => touchNode(node));
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
        
        reporter.info(`Multiple fetches required. Using concurrency of ${concurrentRequests} for ${numberOfBatches} remaining fetches.`);
        
        const queue = new PQueue({concurrency: concurrentRequests});
        const pages = [...Array(numberOfBatches).keys()];
        
        pages.forEach(pageNumber => {
            queue.add(async () => {
                const offset = (pageNumber + 1) * batchSize;
                const response = await __fetch(syncQuery, {
                    ...variables,
                    offset,
                });            
                if (response.errors && response.errors.length) {
                    reporter.panic(`
Sync failed at query:
    ${JSON.stringify(variables)}
    offset ${offset}}
Got errors: ${JSON.stringify(response.errors)}
                    `);
                }
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

    const stamp = Math.floor(Date.now() / 1000);
    await cache.set(`lastFetch`, stamp);

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
        forceRefresh: Joi.boolean()
            .falsy(0, 'N', 'no', 'No', '0', 'false')
            .truthy(1, 'Y', 'yes', 'Yes', '1', 'true')
            .default(false)
        
  })
};

exports.createSchemaCustomization = async ({ actions, ...rest }, pluginConfig) => {
    const { createTypes, createFieldExtension } = actions;
    // Adds a directive to specify that a field is pre-sorted and unfilterable.
    createFieldExtension({
      name: `serialised`,
      extend() {
        return {
          resolve(source, args, context, resolveInfo) {              
              return source[resolveInfo.fieldName]
                .map(id => context.nodeModel.getNodeById(id));
          },
        }
      },
    });

    const schema = __stateCache.schema;
    createTypes(schema);
};

exports.createResolvers = ({ createResolvers, intermediateSchema }) => {
    

    const getDefaultSortForType = (typeName) => {
        const type = intermediateSchema.getType(typeName);
        if (!type) {
            return null;
        }
        const directive = type.astNode.directives?.find(d => d.name.value === 'defaultSort');
        if (!directive) {
            return null;
        }
        const col = directive.arguments.find(arg => arg.name.value === 'column');
        const dir = directive.arguments.find(arg => arg.name.value === 'direction');

        if (!col || !dir) {
            return null;
        }

        return {
            order: [dir.value.value],
            fields: [col.value.value],
        };
    };

    const resolvers = {
        Query: {},
    };

    const queryType = intermediateSchema.getType(`Query`);
    queryFields = queryType.getFields();
    queryFieldNames = Object.keys(queryFields);


    __stateCache.types.forEach(typeName => {
        const type = intermediateSchema.getType(typeName);
        if (!type || type.constructor.name !== 'GraphQLObjectType') {
            return;
        }

        const defaultSort = getDefaultSortForType(typeName);
        if (defaultSort) {
            const typeQueryName = queryFieldNames.find(name => (
                queryFields[name].type.toString() === `${typeName}Connection!`
            ));
            const interfaceQueryName = queryFieldNames.find(name => (
                queryFields[name].type.toString() === `${typeName}InterfaceConnection!`
            ));
            const queries = [typeQueryName, interfaceQueryName].filter(t => t);
            queries.forEach(queryName => {
                const sortArg = queryFields[queryName].args.find(arg => arg.name === 'sort');
                if (!sortArg) {
                    return;
                }
                sortArg.defaultValue = defaultSort;
            });
        }
        const allFields = type.getFields();
        const fieldNames = Object.keys(allFields);
        const fieldResolvers = {};
        fieldNames.forEach(fieldName => {        
            const field = allFields[fieldName];
            // If the field is pre sorted and unfilterable, the resolver is
            // handled by the extension
            if (field.extensions.serialised) { 
                return;
            }

            const fullType = field.type.toString();
            const namedType = fullType.replace(/[^A-Za-z0-9_]+/g, '');
            const isList = fullType.startsWith(`[`);
            if (namedType && __stateCache.types.includes(namedType)) {
                const namedTypeToFetch = namedType.replace(/InheritanceUnion$/, 'Interface');
                if (isList) {        
                    fieldResolvers[field.name] = {
                        args: {
                            filter: {
                                type: `${namedTypeToFetch}FilterInput`,
                            },
                            sort: {
                                type: `${namedTypeToFetch}SortInput`,
                            },
                            skip: {
                                type: `Int`
                            },
                            limit: {
                                type: `Int`,
                            },
                        },
                        resolve(source, args, context, info) {
                            if (!Array.isArray(source[field.name])) {
                                return null;
                            }
                            const ids = source[field.name].map(o => o.id);
                            return context.nodeModel.runQuery({
                                query: {
                                    filter: {
                                        ...args.filter ?? {},
                                        id: { in: ids },                                
                                    },
                                    sort: args.sort ?? getDefaultSortForType(namedTypeToFetch),  
                                    skip: args.skip ?? null,
                                    limit: args.limit ?? null,
                                },
                                type: namedTypeToFetch,
                                firstOnly: false,
                            })
                        }
                    };

                } else {
                    fieldResolvers[field.name] = {                        
                        resolve(source, args, context) {
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

    // Handle file relationships
    __stateCache.files.forEach(fileTypeName => {
        resolvers[fileTypeName] = {
            ...resolvers[fileTypeName],
            localFile: {
                resolve(source, args, context) {
                    if (!source.localFile.id) {
                        return null;
                    }
                    return context.nodeModel.getNodeById({
                        id: source.localFile.id,
                        type: `File`,
                    })                    
                }
            }
        }
    });
    createResolvers(resolvers);
}




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