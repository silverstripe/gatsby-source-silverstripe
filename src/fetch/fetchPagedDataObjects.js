const { executeQuery } = require('./executeQuery');
const syncQuery = require('../queries/syncQuery');

const fetchPagedDataObjects = async ({
  limit,
  offsetToken = null,
  since = null,
  aggregatedResponse = null,
  total,
}) => {
  const variables = { Limit: limit, Token: offsetToken };
  let newAggregatedResponse = aggregatedResponse;
  try {
    const json = await executeQuery(syncQuery, variables);
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
      return fetchPagedDataObjects({
        since,
        limit,
        total,
        offsetToken: data.results.offsetToken,        
        aggregatedResponse: newAggregatedResponse,        
      });
    }

    return newAggregatedResponse;
  } catch (e) {
    console.error(e);
  }
};

module.exports = fetchPagedDataObjects;
