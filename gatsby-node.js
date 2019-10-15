const handlePreBootstrap = require('./src/build/handlePreBootstrap');
const handleSourceNodes = require('./src/build/handleSourceNodes');
const handlePreExtractQueries = require('./src/build/handlePreExtractQueries');

exports.onPreBootstrap = handlePreBootstrap;
exports.sourceNodes = handleSourceNodes;
exports.onPreExtractQueries = handlePreExtractQueries;