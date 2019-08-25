'use strict';

const path = require(`path`);

const _ = require(`lodash`);

const fs = require(`fs-extra`);
const fetchData = require(`./fetch`);
const typePrefix = 'SilverStripe';

const HAS_ONE = 'HAS_ONE';
const HAS_MANY = 'HAS_MANY';
const MANY_MANY = 'MANY_MANY';
const BELONGS_TO = 'BELONGS_TO';

const makeTypeName = type => (
  _.upperFirst(
    _.camelCase(
      `${typePrefix} ${type.substr(type.lastIndexOf('__') + 1)}`
    )
  )
);

const {
  createPluginConfig,
  validateOptions
} = require(`./plugin-options`);

exports.onPreBootstrap = () => {
  return validateOptions;
};

exports.sourceNodes = async ({
  actions,
  getNode,
  getNodes,
  createNodeId,
  createContentDigest,
  store,
  cache,
  reporter
}, pluginOptions) => {
  const {
    createNode,
    deleteNode,
    touchNode,
    setPluginStatus
  } = actions;
  const pluginConfig = createPluginConfig(pluginOptions);

  const createSyncToken = () => (
    `${pluginConfig.get(`host`)}`
  )

  let syncToken;

  if (
    !pluginConfig.get('forceFullSync') && 
    store.getState().status.plugins && 
    store.getState().status.plugins['gatsby-source-silverstripe'] &&
    store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()]
  ) {
    syncToken = store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()];
  }

  const data = await fetchData({
    syncToken,
    reporter,
    pluginConfig,
  });

  const nodes = new Map();

  // first pass - create basic nodes
  data.currentSyncData.forEach(record => {
    const contentFields = JSON.parse(record.contentFields);
    delete record.contentFields;
    const node = {
      ...record,
      ...contentFields,
      id: createNodeId(record.uuid),
      silverstripe_id: record.id,      
      internal: {
        type: makeTypeName(record.className),
      },
    };
    nodes.set(record.uuid, node);
  });

  // second pass - handle relationships and back references
  const processedNodes = [];
  nodes.forEach(n => {
    // deep clone
    const node = JSON.parse(JSON.stringify(n));
    node.relations.forEach(({ type, records, name}) => {
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
              `Could not find related record for ${type} relation "${name}" on ${node.internal.type}`
            );
            return;
          }
          console.log(relatedRecord.id);
          node[`${name}___NODE`] = relatedRecord.id;
          break;
        }
        case HAS_MANY:
        case MANY_MANY: {
          if (!records.length) {
            return;
          }

          node[`${name}___NODE`] = records.map(({ uuid, className, id }) => {
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
          });
          break;
        }
      }
    })
    delete node.relations;
    node.StaffMembers___NODE && console.log(node.StaffMembers___NODE);
    processedNodes.push(node);
  });

  // Create each node
  processedNodes.forEach(node => {
    node.internal.contentDigest = createContentDigest(node);
    createNode(node);
  });
};


exports.onPreExtractQueries = async ({
  store,
  getNodesByType
}) => {
  const program = store.getState().program;
  const CACHE_DIR = path.resolve(`${program.directory}/.cache/silverstripe/assets/`);
  await fs.ensureDir(CACHE_DIR);

  if (getNodesByType(`SilverStripeFile`).length == 0) {
    return;
  }

  let gatsbyImageDoesNotExist = true;

  try {
    require.resolve(`gatsby-image`);

    gatsbyImageDoesNotExist = false;
  } catch (e) {// Ignore
  }

  if (gatsbyImageDoesNotExist) {
    return;
  } // We have both gatsby-image installed as well as ImageSharp nodes so let's
  // add our fragments to .cache/fragments.


  await fs.copy(
    require.resolve(`gatsby-source-silverstripe/fragments.js`),
    `${program.directory}/.cache/fragments/silverstripe-asset-fragments.js`
  );
};
