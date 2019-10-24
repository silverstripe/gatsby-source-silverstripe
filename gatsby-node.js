const handlePreBootstrap = require('./src/build/handlePreBootstrap');
const handleSourceNodes = require('./src/build/handleSourceNodes');
const handlePreExtractQueries = require('./src/build/handlePreExtractQueries');
const handleSchemaCustomization = require('./src/build/handleSchemaCustomization');

exports.onPreBootstrap = handlePreBootstrap;
exports.sourceNodes = handleSourceNodes;
exports.onPreExtractQueries = handlePreExtractQueries;
exports.createSchemaCustomization = handleSchemaCustomization;

