const { setEndpoint } = require('../fetch/executeQuery');

const handlePreBootstrap = ({ reporter }, pluginOptions) => {
    const host = pluginOptions.host;
    if (!host || !host.match(/^http/)) {
      reporter.panic(`
        You have not configured a host for your Silverstripe data source. 
        Please specify one in your gatsby-config.js file
      `);
    }
    setEndpoint(`${pluginOptions.host}/__gatsby/graphql`);
  };

module.exports = handlePreBootstrap;