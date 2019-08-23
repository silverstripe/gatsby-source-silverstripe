'use strict';

const path = require(`path`);

const _ = require(`lodash`);

const fs = require(`fs-extra`);
const fetchData = require(`./fetch`);
const typePrefix = 'SilverStripe';
const makeTypeName = type => _.upperFirst(_.camelCase(`${typePrefix} ${type.substr(type.lastIndexOf('\\') + 1)}`));

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

  const createSyncToken = () => `${pluginConfig.get(`spaceId`)}-${pluginConfig.get(`environment`)}-${pluginConfig.get(`host`)}`;

  let syncToken;

  if (!pluginConfig.get('forceFullSync') && store.getState().status.plugins && store.getState().status.plugins['gatsby-source-silverstripe'] && store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()]) {
    syncToken = store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()];
  }

  const data = await fetchData({
    syncToken,
    reporter,
    pluginConfig,
  });


  const nodes = new Map();

  // first pass - create basic nodes
  _.each(data.data.sync, datum => {
    const node = {
      id: createNodeId(datum.ID),
      silverstripe_id: datum.ID,
      parent: null,
      parent_id: datum.ParentID,
      ...datum,
      children: [],
      relationships: {},
      internal: {
        type: makeTypeName(datum.ClassName),
      },
    };
    // nodeFromData(datum, createNodeId)
    nodes.set(node.id, node);
  });

  // second pass - handle relationships and back references
  // nodes.forEach(node => {
  //   handleReferences(node, {
  //     getNode: nodes.get.bind(nodes),
  //     createNodeId,
  //   });
  // });

  // Create each node
  for (const node of nodes.values()) {
    node.internal.contentDigest = createContentDigest(node);
    createNode(node);
  }
};


exports.onPreExtractQueries = async ({
  store,
  getNodesByType
}) => {
  const program = store.getState().program;
  const CACHE_DIR = path.resolve(`${program.directory}/.cache/silverstripe/assets/`);
  await fs.ensureDir(CACHE_DIR);

  if (getNodesByType(`SilverStripeAsset`).length == 0) {
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


  await fs.copy(require.resolve(`gatsby-source-silverstripe/fragments.js`), `${program.directory}/.cache/fragments/silverstripe-asset-fragments.js`);
};
