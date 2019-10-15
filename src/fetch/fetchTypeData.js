const { executeQuery } = require('./executeQuery');
const introspectionQuery = require('../queries/introspectionQuery');

const fetchTypeData = async () => {
  const json = await executeQuery(introspectionQuery);

  return json.data.__schema.types;
};

module.exports = fetchTypeData;
