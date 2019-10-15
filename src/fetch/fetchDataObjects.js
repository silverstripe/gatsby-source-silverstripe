const fetchSummaryData = require('./fetchSummaryData');
const fetchPagedDataObjects = require('./fetchPagedDataObjects');
const { setEndpoint } = require('./executeQuery');

const LIMIT = 100;

const fetchDataObjects = async ({
  syncToken,
  reporter,
  pluginConfig
}) => {
  // Fetch dataobjects.
  console.time(`Fetch SilverStripe data`);
  console.log(`Starting to fetch data from SilverStripe`);
  setEndpoint(`${pluginConfig.get('host')}/__gatsby/graphql`);


  let currentSyncData;

  try {
    const since = syncToken || null;
    const summary = await fetchSummaryData(since);
    console.log(`Fetching ${summary.total} records across ${summary.includedClasses.length} dataobjects...`);
    currentSyncData = await fetchPagedDataObjects(LIMIT, summary.total, null, since);
  } catch (e) {
    reporter.panic('Fetching SilverStripe data failed', e);
  } 

  return {
    currentSyncData: currentSyncData.results,
  };
};

module.exports = fetchDataObjects;
