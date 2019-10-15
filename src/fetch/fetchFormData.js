const { executeQuery } = require('./executeQuery');
const formsNamesQuery = require('../queries/formNamesQuery');
const formQuery = require('../queries/formQuery');

const fetchFormData = async () => {
	const json = await executeQuery(formsNamesQuery);
	const names = json.data.__type ? json.data.__type.enumValues.map(e => e.name) : [];
 	const promises = names.map(name => {
		return executeQuery(formQuery, { Name: name });
	});

	return await Promise.all(promises);
};

module.exports = fetchFormData;

