const fetch = require('isomorphic-fetch');
const summaryQuery = require('../queries/summaryQuery');
const syncQuery = require('../queries/syncQuery');

const RELATION_SINGULAR = 'SINGULAR';
const RELATION_PLURAL = 'PLURAL';
const DEFAULT_LIMIT = 100;

class API {

    constructor(params) {
        [`gatsby`, `apiKey`, `host`].forEach(param => {
            if (!params[param]) {
                throw new Error(`API requires a ${param} parameter`);
            }
        });

        const { gatsby, apiKey, host } = params;
        this.apiKey = apiKey;
        this.host = host;
        this.gatsby = gatsby;
        this.forceFullSync = false;
        this.url = `${host}/__gatsby/graphql`;
        this.nodes = new Map();
        this.types = new Map();
        this.since = params.since || null;
    }

    setGatsby(gatsby) {
        this.gatsby = gatsby;

        return this;
    }

    async build() {
        this.summary = await this.fetchSummaryData();
        this.includedClasses = this.summary.includedClasses.map(c => c.className);

        this.gatsby.reporter.info(
            `Fetching ${this.summary.total} records across ${this.includedClasses.length} dataobjects...`
        );

        const data = await this.fetchDataObjects();

        if (!data) {
            this.gatsby.reporter.panic(
                `Encoutered unrecoverable errors trying to fetch dataobjects from Silverstripe. Skipping.`
            );
        }

        let { nodes } = data.currentSyncData;
        nodes = this.buildBaseNodes(nodes);
        nodes = this.decorateNodes(nodes);
        
        nodes.forEach(node => {
            node.internal.contentDigest = this.gatsby.createContentDigest(node);
            this.gatsby.actions.createNode(node);
        });
    }

    buildBaseNodes(nodes) {
        const processedNodes = [];
        nodes.forEach(record => {
            const contentFields = JSON.parse(record.contentFields);
            delete record.contentFields;
            const typeName = record.typeAncestry[1];
            if (!typeName) {
                this.gatsby.reporter.error(
                    `Could not find type name in ancestry:`,
                    record.typeAncestry
                )
            }
            this.types.set(typeName, true);
            this.gatsby.reporter.info(typeName);
            let node = {
                ...record,
                silverstripe_id: record.id,
            };
            // These two fields are unique for each subclass
            node.id = this.gatsby.createNodeId(`${record.uuid}`);
            node.internal = {
                type: `SS${typeName}`
            };

            node = {
                ...node,
                ...contentFields,
            };
            processedNodes.push(node);
            this.nodes.set(`${record.uuid}`, node);
        });

        return processedNodes;
    }

    decorateNodes(nodes) {
        const processedNodes = [];
        nodes.forEach(n => {
            this.addRelations(n);
            delete n.relations;
            this.addHierarchy(n);
            delete n.typeAncestry;
            processedNodes.push(n);
        });

        return processedNodes;
    }

    addRelations(rawNode) {
        const node = JSON.parse(JSON.stringify(rawNode));
        node.relations.forEach(({ type, records, name }) => {

            switch (type) {
                case RELATION_SINGULAR: {
                    if (!records.length) {
                        return;
                    }
                    const record = records[0];

                    // Skip the relationship if the class is not part of the sync (e.g. Member)
                    if (!this.includedClasses.includes(record.className)) {
                        return;
                    }

                    const foreignSKU = `${record.uuid}`;
                    const relatedRecord = this.nodes.get(foreignSKU);
                    if (!relatedRecord) {
                        this.gatsby.reporter.warn(
                            `Could not find related record for ${type} relation "${name}" 
                        (foreign ID "${foreignSKU}") on ${node.internal.type} with 
                        link ${node.link}`
                        );
                        return;
                    }

                    node[`${name}___NODE`] = relatedRecord.id;
                    break;
                }

                case RELATION_PLURAL: {
                    if (!records.length) {
                        return;
                    }
                    node[`${name}___NODE`] = records.map(({ uuid, className, id }) => {

                        if (!this.includedClasses.includes(className)) {
                            return;
                        }

                        const foreignSKU = `${uuid}`;
                        const relatedRecord = this.nodes.get(foreignSKU);
                        if (!relatedRecord) {
                            this.gatsby.reporter.warn(
                                `Could not find related record for ${type} relation "${name}" 
                        on ${node.internal.type} (${className}, ${id})`
                            );
                            return;
                        }

                    });
                    break;
                }
            }
        })
    }

    addHierarchy(node) {
        if (!node.typeAncestry.includes('SiteTree')) {
            node.hierarchy = {};
            return;
        }

        if (node.hierarchy.parent) {
            const { uuid, id } = node.hierarchy.parent;
            const foreignSKU = `${uuid}`;
            const relatedRecord = this.nodes.get(foreignSKU);
            if (!relatedRecord) {
                this.gatsby.reporter.warn(
                    `Could not find SiteTree ${id} for hierarchy "parent" on ${node.className} ${node.silverstripe_id}}`
                );
                return;
            }

            node.hierarchy.parent___NODE = relatedRecord.id;
            delete node.hierarchy.parent;
        }

        const hierarchyFields = ['ancestors', 'allAncestors', 'children', 'allChildren'];

        hierarchyFields.forEach(field => {
            node.hierarchy[`${field}___NODE`] = node.hierarchy[field].map(({ uuid, id }) => {
                const foreignSKU = `${uuid}`;
                const relatedRecord = this.nodes.get(foreignSKU);
                if (!relatedRecord) {
                    this.gatsby.reporter.warn(
                        `Could not find SiteTree ${id} for hierarchy field ${field} on ${node.className} ${node.silverstripe_id}`
                    );
                    return;
                }
                return relatedRecord.id;

            });
            delete node.hierarchy[field];
        })
    }


    async fetchSummaryData() {
        try {
            const json = await this.executeQuery(summaryQuery);
            return json.data.sync.summary;
        } catch (e) {
            this.gatsby.reporter.panic(`Failed to fetch summary data`, e);
        }

    }

    async fetchDataObjects() {
        try {
            const currentSyncData = await this.fetchPagedDataObjects(null);
            return {
                currentSyncData: currentSyncData.results,
            };

        } catch (e) {
            this.gatsby.reporter.panic('Fetching SilverStripe data failed', e);
        }
    };

    async fetchPagedDataObjects(offsetToken = null, currentResponse) {
        const variables = { Limit: DEFAULT_LIMIT, Token: offsetToken };
        let aggregate = currentResponse;
        try {
            const json = await this.executeQuery(syncQuery, variables);
            const data = json.data.sync;
            this.gatsby.reporter.info(`Adding ${data.results.nodes.length} records...`);
            if (!aggregate) {
                aggregate = data;
            } else {
                aggregate.results.nodes = aggregate.results.nodes.concat(data.results.nodes);
            }

            const pct = Math.floor((aggregate.results.nodes.length / this.summary.total) * 100);
            this.gatsby.reporter.info(`${pct}% complete`);

            if (data.results.offsetToken) {
                return this.fetchPagedDataObjects(data.results.offsetToken, aggregate);
            }

            return aggregate;
        } catch (e) {
            this.gatsby.reporter.error(e);
        }
    };

    async executeQuery(query, variables = {}) {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: this.host,
                    'X-Api-Key': this.apiKey,
                },
                body: JSON.stringify({ query, variables }),
            });
            const json = await response.json();
            if (json.errors && json.errors.length) {
                this.gatsby.reporter.error(json.errors);
                throw new Error(`There was an error executing the GraphQL query`);
            }
            return json;
        } catch (e) {
            this.gatsby.reporter.info('query:', query);
            this.gatsby.reporter.info('variables:', variables);
            this.gatsby.reporter.error(e);
        }
    };
}

module.exports = API;