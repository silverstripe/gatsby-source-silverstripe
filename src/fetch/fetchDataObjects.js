const fetchSummaryData = require('./fetchSummaryData');
const fetchPagedDataObjects = require('./fetchPagedDataObjects');
const { setEndpoint , setApiKey} = require('./executeQuery');

const LIMIT = 100;

const fetchDataObjects = async ({
  syncToken,
  reporter,
  total,
}) => {
  // Fetch dataobjects.
  console.log(`Starting to fetch data from SilverStripe`);

  let currentSyncData;

  try {
    const since = syncToken || null;
    currentSyncData = await fetchPagedDataObjects({
      limit: LIMIT,
      since,
      total,
    });
  } catch (e) {
    reporter.panic('Fetching SilverStripe data failed', e);
  } 

  return {
    currentSyncData: currentSyncData.results,
  };
};

module.exports = fetchDataObjects;
