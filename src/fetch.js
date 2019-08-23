

const fetch = require('isomorphic-fetch');

module.exports = async ({
  syncToken,
  reporter,
  pluginConfig,
}) => {
  const query = `
  query {
    sync {
      ID
      Title
      Content
    }
  }
`;

  const syncData = fetch(process.env.GATSBY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.GATSBY_API_URL,
    },
    body: JSON.stringify({ query }),
  })
    .then(res => res.json())
    .catch(console.error);


  return syncData;
};

// module.exports = async ({
//   syncToken,
//   reporter,
//   pluginConfig
// }) => {
//   // Fetch articles.
//   console.time(`Fetch SilverStripe data`);
//   console.log(`Starting to fetch data from SilverStripe`);
//   const contentfulClientOptions = {
//     space: pluginConfig.get(`spaceId`),
//     accessToken: pluginConfig.get(`accessToken`),
//     host: pluginConfig.get(`host`),
//     environment: pluginConfig.get(`environment`)
//   };
//
//
//
//   const client = contentful.createClient(contentfulClientOptions); // The sync API puts the locale in all fields in this format { fieldName:
//   // {'locale': value} } so we need to get the space and its default local.
//   //
//   // We'll extend this soon to support multiple locales.
//
//
//   let currentSyncData;
//
//   try {
//     const query = syncToken ? {
//       nextSyncToken: syncToken,
//     } : {
//       initial: true,
//     };
//     currentSyncData = await client.sync(query);
//   } catch (e) {
//     reporter.panic(`Fetching SilverStripe data failed`, e);
//   } // We need to fetch content types with the non-sync API as the sync API
//   // doesn't support this.
//
//
//   let contentTypes;
//
//   try {
//     contentTypes = await pagedGet(client, `getContentTypes`);
//   } catch (e) {
//     console.log(`error fetching content types`, e);
//   }
//
//   console.log(`contentTypes fetched`, contentTypes.items.length);
//   let contentTypeItems = contentTypes.items; // Fix IDs on entries and assets, created/updated and deleted.
//
//   contentTypeItems = contentTypeItems.map(c => normalize.fixIds(c));
//   currentSyncData.entries = currentSyncData.entries.map(e => {
//     if (e) {
//       return normalize.fixIds(e);
//     }
//
//     return null;
//   });
//
//
//   // currentSyncData.assets = currentSyncData.assets.map(a => {
//   //   if (a) {
//   //     return normalize.fixIds(a);
//   //   }
//   //
//   //   return null;
//   // });
//
//
//   currentSyncData.deletedEntries = currentSyncData.deletedEntries.map(e => {
//     if (e) {
//       return normalize.fixIds(e);
//     }
//
//     return null;
//   });
//
//
//   currentSyncData.deletedAssets = currentSyncData.deletedAssets.map(a => {
//     if (a) {
//       return normalize.fixIds(a);
//     }
//
//     return null;
//   });
//
//
//   const result = {
//     currentSyncData,
//     contentTypeItems,
//   };
//   return result;
// };
// /**
//  * Gets all the existing entities based on pagination parameters.
//  * The first call will have no aggregated response. Subsequent calls will
//  * concatenate the new responses to the original one.
//  */


function pagedGet(client, method, query = {}, skip = 0, pageLimit = 1000, aggregatedResponse = null) {
  return client[method](Object.assign({}, query, {
    skip,
    limit: pageLimit,
    order: 'sys.createdAt',
  }))
    .then((response) => {
      if (!aggregatedResponse) {
        aggregatedResponse = response;
      } else {
        aggregatedResponse.items = aggregatedResponse.items.concat(response.items);
      }

      if (skip + pageLimit <= response.total) {
        return pagedGet(client, method, query, skip + pageLimit, pageLimit, aggregatedResponse);
      }

      return aggregatedResponse;
    });
}
