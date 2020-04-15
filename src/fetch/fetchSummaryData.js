const { executeQuery } = require('./executeQuery');
const summaryQuery = require('../queries/summaryQuery');

const fetchSummaryData = async (since = null) => {
  const json = await executeQuery(summaryQuery);
  return json.data.sync.summary;
};

module.exports = fetchSummaryData;