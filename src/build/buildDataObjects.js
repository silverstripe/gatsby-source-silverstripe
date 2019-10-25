const _ = require(`lodash`);
const fetchDataObjects = require('../fetch/fetchDataObjects');
const { createPluginConfig } = require('../../plugin-options');

const RELATION_SINGULAR = 'SINGULAR';
const RELATION_PLURAL = 'PLURAL';

const buildDataObjects = async ({
  actions,
  createNodeId,
  createContentDigest,
  store,
  reporter
}, pluginOptions) => {
  const {
    createNode,
  } = actions;
  const pluginConfig = createPluginConfig(pluginOptions);

  const createSyncToken = () => (
    `${pluginConfig.get(`host`)}`
  )

  let syncToken;
  if (!pluginConfig.get('forceFullSync')) {
    syncToken = _.get(store.getState(), `status.plugins.gatsby-source-silverstripe.${createSyncToken()}`);
  }

  const data = await fetchDataObjects({
    syncToken,
    reporter,
    pluginConfig,
  });

  if (!data) {
    console.error(`Encoutered unrecoverable errors trying to fetch dataobjects from Silverstripe. Skipping.`)
  }

  const nodes = new Map();

  // first pass - create basic nodes
  data.currentSyncData.nodes.forEach(record => {
    const contentFields = JSON.parse(record.contentFields);
    delete record.contentFields;
    // Start at DataObject
    const typeInheritance = record.typeAncestry.slice(
      record.typeAncestry.indexOf('DataObject')
      );
    let parentNode;
    typeInheritance.forEach(typeName => {
      let inheritedContentFields = parentNode ? parentNode.contentFields : {};
      let inheritedRelations = [
        ...parentNode.relations,
        ...record.relations.filter(r => r.ownerType === typeName),
      ];

      if (contentFields[typeName]) {
        inheritedContentFields = {
          ...contentFields[typeName]
        };
      }
      const uninheritedRelations = ;

      const node = {
        ...record,
        ...inheritedContentFields,
        relations: inheritedRelations,
        id: createNodeId(`${typeName}-${record.uuid}`),
        silverstripe_id: record.id,
        internal: {
          type: `SS${typeName}`,
        },
      };
      nodes.set(`${record.uuid}--${typeName}`, node);
      parentNode = node;
    });
  });

  // second pass - handle relationships and back references
  const processedNodes = [];
  nodes.forEach(n => {
    // deep clone
    const node = JSON.parse(JSON.stringify(n));
    node.relations.forEach(({ type, records, childType, name}) => {
      switch (type) {
        case RELATION_SINGULAR: {
          if (!records.length) {
            return;
          }
          const record = records[0];
          const foreignSKU = `${record.uuid}--${childType}`;
          const relatedRecord = nodes.get(foreignSKU);
          if (!relatedRecord) {
            console.warn(
              `Could not find related record for ${type} relation "${name}" (foreign ID "${foreignID}") on ${node.internal.type} with link ${node.link}`
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
            const foreignSKU = `${uuid}--${childType}`;
            const relatedRecord = nodes.get(foreignSKU);
            if (!relatedRecord) {
              console.warn(
                `Could not find related record for ${type} relation "${name}" 
                on ${node.internal.type} (${className}, ${id})`
              );
              return;
            }
            return relatedRecord.id;
          });
          break;
        }
      }
    })
    delete node.relations;
    processedNodes.push(node);
  });

  // Create each node
  processedNodes.forEach(node => {
    node.internal.contentDigest = createContentDigest(node);
    createNode(node);
  });
};


module.exports = buildDataObjects;
