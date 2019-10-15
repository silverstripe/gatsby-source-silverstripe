const { validateOptions } = require(`../../plugin-options`);
const handlePreBootstrap = () => validateOptions;

module.exports = handlePreBootstrap;