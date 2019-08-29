const fetch = require('isomorphic-fetch');

const LIMIT = 100;

let endpoint;

// todo: add "Since" param
const resultsQuery = `
query Sync($Limit:Int!, $Token:String) {
  sync {
    results(limit: $Limit, offsetToken: $Token) {
      offsetToken
      nodes {
        id
        parentUUID
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
          ownerType
          records {
            className
            id
            uuid
          }
        }
      }
    }
  }
}`;
// Todo: Add "since" param
const summaryQuery = `
  query {
    sync {
      summary {
        total
        includedClasses
      }
    }
  }
`;

const doFetch = async (query, variables = {}) => {
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
    return json;
  } catch (e) {
    console.error(e);
  }
};

const getSummaryData = async (since = null) => {
  const json = await doFetch(summaryQuery);

  return json.data.sync.summary;
};

const getPagedData = async (limit, total, offsetToken = null, since = null, aggregatedResponse = null) => {
  const variables = { Limit: limit, Token: offsetToken };
  let newAggregatedResponse = aggregatedResponse;
  try {
    const json = await doFetch(resultsQuery, variables);
    const data = json.data.sync;
    console.log(`Adding ${data.results.nodes.length} records...`);
    if (!newAggregatedResponse) {
      newAggregatedResponse = data;
    } else {
      newAggregatedResponse.results.nodes = newAggregatedResponse.results.nodes.concat(data.results.nodes);
    }
    const pct = Math.floor((newAggregatedResponse.results.nodes.length/total) * 100);
    console.log(`${pct}% complete`);
    if (data.results.offsetToken) {
      return getPagedData(limit, total, data.results.offsetToken, since, newAggregatedResponse);
    }

    return newAggregatedResponse;
  } catch (e) {
    console.error(e);
  }
  
};


module.exports = async ({
  syncToken,
  reporter,
  pluginConfig
}) => {
  // Fetch dataobjects.
  console.time(`Fetch SilverStripe data`);
  console.log(`Starting to fetch data from SilverStripe`);
  endpoint = `${pluginConfig.get('host')}/__gatsby/graphql`;


  let currentSyncData;

  try {
    const since = syncToken || null;
    const summary = await getSummaryData(since);
    console.log(`Fetching ${summary.total} records across ${summary.includedClasses.length} dataobjects...`);
    currentSyncData = await getPagedData(LIMIT, summary.total, null, since);
  } catch (e) {
    reporter.panic('Fetching SilverStripe data failed', e);
  } 

  return {
    currentSyncData: currentSyncData.results,
  };
};
