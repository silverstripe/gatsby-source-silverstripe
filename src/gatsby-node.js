"use strict";

const path = require(`path`);

const _ = require(`lodash`);

const fs = require(`fs-extra`);
const fetchData = require(`./fetch`);
const typePrefix = 'SilverStripe'
const makeTypeName = type => _.upperFirst(_.camelCase(`${typePrefix} ${type}`));

const {
  createPluginConfig,
  validateOptions
} = require(`./plugin-options`);

const {
  downloadContentfulAssets
} = require(`./download-contentful-assets`);

const conflictFieldPrefix = `contentful`; // restrictedNodeFields from here https://www.gatsbyjs.org/docs/node-interface/

const restrictedNodeFields = [`children`, `contentful_id`, `fields`, `id`, `internal`, `parent`];

exports.onPreBootstrap = () => {
  console.log('addsadsad');
  return validateOptions;
};
/***
 * Localization algorithm
 *
 * 1. Make list of all resolvable IDs worrying just about the default ids not
 * localized ids
 * 2. Make mapping between ids, again not worrying about localization.
 * 3. When creating entries and assets, make the most localized version
 * possible for each localized node i.e. get the localized field if it exists
 * or the fallback field or the default field.
 */


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
  console.log('source nodes');
  const {
    createNode,
    deleteNode,
    touchNode,
    setPluginStatus
  } = actions;
  const pluginConfig = createPluginConfig(pluginOptions);

  const createSyncToken = () => `${pluginConfig.get(`spaceId`)}-${pluginConfig.get(`environment`)}-${pluginConfig.get(`host`)}`;

  console.log(createSyncToken()); // Get sync token if it exists.

  let syncToken;

  if (!pluginConfig.get('forceFullSync') && store.getState().status.plugins && store.getState().status.plugins['gatsby-source-silverstripe'] && store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()]) {
    syncToken = store.getState().status.plugins['gatsby-source-silverstripe'][createSyncToken()];
  }

  const currentSyncData = await fetchData({
    syncToken,
    reporter,
    pluginConfig,
  });


  currentSyncData.data.sync.forEach((entryItem) => {
    const node = createNode({
      id: createNodeId(`my-data-${entryItem.ID}`),
      parent: null,
      children: [],
      internal: {
        type: `${makeTypeName('Page')}`,
        content: entryItem.title,
        contentDigest: createContentDigest(entryItem),
      },
    });


    console.log(node);
  });

  // const entryList = normalize.buildEntryList({
  //   currentSyncData,
  //   contentTypeItems,
  // });
  //
  // console.log(currentSyncData);
  // console.log(contentTypeItems);



  // currentSyncData.deletedEntries.forEach(deleteNode);
  // currentSyncData.deletedAssets.forEach(deleteNode);
  //
  // const existingNodes = getNodes().filter(n => n.internal.owner === 'gatsby-source-silverstripe');
  // existingNodes.forEach(n => touchNode({
  //   nodeId: n.id,
  // }));
  //
  // const { assets } = currentSyncData;
  // console.log('Updated entries ', currentSyncData.entries.length);
  // console.log('Deleted entries ', currentSyncData.deletedEntries.length);
  // console.log('Updated assets ', currentSyncData.assets.length);
  // console.log('Deleted assets ', currentSyncData.deletedAssets.length);
  // console.timeEnd('Fetch Contentful data'); // Update syncToken
  //
  // const { nextSyncToken } = currentSyncData; // Store our sync state for the next sync.
  //
  // const newState = {};
  // newState[createSyncToken()] = nextSyncToken;
  // setPluginStatus(newState); // Create map of resolvable ids so we can check links against them while creating
  // // links.
  //
  // const resolvable = normalize.buildResolvableSet({
  //   existingNodes,
  //   entryList,
  //   assets,
  // }); // Build foreign reference map before starting to insert any nodes
  //
  // const foreignReferenceMap = normalize.buildForeignReferenceMap({
  //   contentTypeItems,
  //   entryList,
  //   resolvable,
  // });
  // const newOrUpdatedEntries = [];
  // entryList.forEach(entries => {
  //   entries.forEach(entry => {
  //     newOrUpdatedEntries.push(entry.sys.id);
  //   });
  // }); // Update existing entry nodes that weren't updated but that need reverse
  // // links added.
  //
  // existingNodes.filter(n => _.includes(newOrUpdatedEntries, n.id)).forEach(n => {
  //   if (foreignReferenceMap[n.id]) {
  //     foreignReferenceMap[n.id].forEach(foreignReference => {
  //       // Add reverse links
  //       if (n[foreignReference.name]) {
  //         n[foreignReference.name].push(foreignReference.id); // It might already be there so we'll uniquify after pushing.
  //
  //         n[foreignReference.name] = _.uniq(n[foreignReference.name]);
  //       } else {
  //         // If is one foreign reference, there can always be many.
  //         // Best to be safe and put it in an array to start with.
  //         n[foreignReference.name] = [foreignReference.id];
  //       }
  //     });
  //   }
  // });
  //
  //
  // contentTypeItems.forEach((contentTypeItem, i) => {
  //   normalize.createContentTypeNodes({
  //     contentTypeItem,
  //     restrictedNodeFields,
  //     conflictFieldPrefix,
  //     entries: entryList[i],
  //     createNode,
  //     createNodeId,
  //     resolvable,
  //     foreignReferenceMap,
  //     defaultLocale,
  //     locales
  //   });
  // });
  // assets.forEach(assetItem => {
  //   normalize.createAssetNodes({
  //     assetItem,
  //     createNode,
  //     createNodeId,
  //     defaultLocale,
  //     locales
  //   });
  // });
  //
  // if (pluginConfig.get(`downloadLocal`)) {
  //   await downloadContentfulAssets({
  //     actions,
  //     createNodeId,
  //     store,
  //     cache,
  //     getNodes,
  //     reporter
  //   });
  // }

  return;
}; // Check if there are any ContentfulAsset nodes and if gatsby-image is installed. If so,
// add fragments for ContentfulAsset and gatsby-image. The fragment will cause an error
// if there's not ContentfulAsset nodes and without gatsby-image, the fragment is useless.


exports.onPreExtractQueries = async ({
  store,
  getNodesByType
}) => {
  const program = store.getState().program;
  const CACHE_DIR = path.resolve(`${program.directory}/.cache/contentful/assets/`);
  await fs.ensureDir(CACHE_DIR);

  if (getNodesByType(`ContentfulAsset`).length == 0) {
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


  await fs.copy(require.resolve(`gatsby-source-silverstripe/src/fragments.js`), `${program.directory}/.cache/fragments/silverstripe-asset-fragments.js`);
};
