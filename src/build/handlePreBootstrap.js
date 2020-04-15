const { initialise } = require('../api/factory');

const handlePreBootstrap = (gatsby, pluginOptions) => {
    const host = pluginOptions.host;
    if (!host || !host.match(/^http/)) {
      gatsby.reporter.panic(`
        You have not configured a host for your Silverstripe data source. 
        Please specify one in your gatsby-config.js file
      `);
    }
    const key = pluginOptions.apiKey;
  
    if (!key) {
      gatsby.reporter.panic(`
      You have not added an apiKey for your Silverstripe data source. 
      Please specify one in your gatsby-config.js file. You can obtain
      your API key from Silverstripe CMS by visiting Security > Your member > API Keys.
      `);
    }

    // Todo: incremental build
    const since = null;

    initialise({
      host: pluginOptions.host,
      apiKey: pluginOptions.apiKey,
      gatsby,
      since,
    });
  };

module.exports = handlePreBootstrap;