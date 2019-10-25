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
<<<<<<< HEAD
=======
  const host = pluginConfig.get('host');
  if (!host || !host.match(/^http/)) {
    reporter.panic(`You have not configured a host for your Silverstripe data source. Please specify one in your gatsby-config.js file`);
  }
  setEndpoint(`${pluginConfig.get('host')}/__gatsby/graphql`);
  setApiKey(`${pluginConfig.get('api_key')}`);

>>>>>>> d1e828f... ADD api module support

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
