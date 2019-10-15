const buildDataObjects = require('./buildDataObjects');
const buildForms = require('./buildForms');

const handleSourceNodes = async (gatsbyData, pluginOptions) => {
  await buildDataObjects(gatsbyData, pluginOptions);
  await buildForms(gatsbyData, pluginOptions);
};

module.exports = handleSourceNodes;