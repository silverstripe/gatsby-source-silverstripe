const fetch = require('isomorphic-fetch');

const LIMIT = 100;

const query = `
query Sync($Limit:Int!, $Token:String) {
  sync(limit: $Limit, offsetToken: $Token) {
    offsetToken
    results {
      id
      uuid
      created
      lastEdited
      className
      ancestry
      contentFields
      link
      relations {
        type
        name
        records {
          className
          id
          uuid
        }
      }
    }
  }
}`;
const getPagedData = async (endpoint, limit, offsetToken = null, since = null, aggregatedResponse = null) => {
  const variables = { Limit: limit, Token: offsetToken };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: process.env.GATSBY_API_URL,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await response.json();
    const data = json.data.sync;
    console.log(`Adding ${data.results.length} records...`);
    if (!aggregatedResponse) {
      aggregatedResponse = data;
    } else {
      aggregatedResponse.results = aggregatedResponse.results.concat(data.results);
    }

    if (data.offsetToken) {
      return getPagedData(endpoint, limit, data.offsetToken, since, aggregatedResponse);
    }

    return aggregatedResponse;
  } catch (e) {
    console.error(e);
  }
//  .then(res => { console.log(res); return res.json() })
  // .then(data => {
  //   console.log('page data', data);
  //   if (!aggregatedResponse) {
  //     aggregatedResponse = data;
  //   } else {
  //     aggregatedResponse.results = aggregatedResponse.results.concat(data.results);
  //   }

  //   if (data.offsetToken) {
  //     return getPagedData(endpoint, limit, data.offsetToken, since, aggregatedResponse);
  //   }

  //   return aggregatedResponse;
  // })
  //.catch(console.error);
  
};


module.exports = async ({
  syncToken,
  reporter,
  pluginConfig
}) => {
  // Fetch articles.
  console.time(`Fetch SilverStripe data`);
  console.log(`Starting to fetch data from SilverStripe`);
  const ssOptions = {
    host: `${pluginConfig.get(`host`)}/__gatsby/graphql`,
  };


  let currentSyncData;

  try {
    const since = syncToken || null;
    currentSyncData = await getPagedData(ssOptions.host, LIMIT, null, since);
  } catch (e) {
    reporter.panic(`Fetching SilverStripe data failed`, e);
  } 

  // currentSyncData.assets = currentSyncData.assets.map(a => {
  //   if (a) {
  //     return normalize.fixIds(a);
  //   }
  //
  //   return null;
  // });


  // currentSyncData.deletedEntries = currentSyncData.deletedEntries.map(e => {
  //   if (e) {
  //     return normalize.fixIds(e);
  //   }

  //   return null;
  // });


  // currentSyncData.deletedAssets = currentSyncData.deletedAssets.map(a => {
  //   if (a) {
  //     return normalize.fixIds(a);
  //   }

  //   return null;
  // });

  const result = {
    currentSyncData: currentSyncData.results,
  };
  return result;
};
