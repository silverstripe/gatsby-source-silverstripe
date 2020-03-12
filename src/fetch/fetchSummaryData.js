const { executeQuery } = require('./executeQuery');
const summaryQuery = require('../queries/summaryQuery');

const fetchSummaryData = async (since = null) => {
  const json = await executeQuery(summaryQuery);
  console.log(json);
  return json.data.sync.summary;
};

module.exports = fetchSummaryData;