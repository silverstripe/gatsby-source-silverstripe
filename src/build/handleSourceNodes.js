const buildDataObjects = require('./buildDataObjects');
const handleSourceNodes = async (gatsbyData, pluginOptions) => {
  await buildDataObjects(gatsbyData, pluginOptions);
};

module.exports = handleSourceNodes;