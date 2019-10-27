const buildDataObjects = require('./buildDataObjects');
const buildForms = require('./buildForms');
const buildElemental = require('./buildElemental');

const handleSourceNodes = async (gatsbyData, pluginOptions) => {
  await buildDataObjects(gatsbyData, pluginOptions);
  // await buildForms(gatsbyData, pluginOptions);
  // await buildElemental(gatsbyData);
};

module.exports = handleSourceNodes;