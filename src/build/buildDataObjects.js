const _ = require(`lodash`);
const fetchDataObjects = require('../fetch/fetchDataObjects');
const { createPluginConfig } = require('../../plugin-options');

const HAS_ONE = 'HAS_ONE';
const HAS_MANY = 'HAS_MANY';
const MANY_MANY = 'MANY_MANY';
const BELONGS_TO = 'BELONGS_TO';

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
    const node = {
      ...record,
      ...contentFields,
      id: createNodeId(record.uuid),
      silverstripe_id: record.id,
      internal: {
        type: 'SilverStripeDataObject',
      },
    };
    nodes.set(record.uuid, node);
  });

  // second pass - handle relationships and back references
  const processedNodes = [];
  nodes.forEach(n => {
    // deep clone
    const node = JSON.parse(JSON.stringify(n));
    node.relations.forEach(({ type, records, ownerType, name}) => {
      if (!node[ownerType]) {
        node[ownerType] = {};
      }
      switch (type) {
        case HAS_ONE:
        case BELONGS_TO:{
          if (!records.length) {
            return;
          }
          const record = records[0];
          const foreignID = record.uuid;
          const relatedRecord = nodes.get(foreignID);
          if (!relatedRecord) {
            console.warn(
              `Could not find related record for ${type} relation "${name}" (foreign ID "${foreignID}") on ${node.internal.type} with link ${node.link}`
            );
            return;
          }
          node[ownerType][`${name}___NODE`] = relatedRecord.id;
          break;
        }
        case HAS_MANY:
        case MANY_MANY: {
          if (!records.length) {
            return;
          }

          node[ownerType][`${name}___NODE`] = records.map(({ uuid, className, id }) => {
            const foreignID = uuid;
            const relatedRecord = nodes.get(foreignID);
            if (!relatedRecord) {
              console.warn(
                `Could not find related record for ${type} relation "${name}" 
                on ${node.internal.type} (${className}, ${id})`
              );
              return;
            }
            return relatedRecord.id;
          }).filter(id => id);
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
