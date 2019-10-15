const buildSiteTree = require('./src/utils/buildSiteTree');
const canonicalName = require('./src/utils/canonicalName');
const createTemplateChooser = require('./src/utils/createTemplateChooser');
const isFile = require('./src/utils/isFile');

module.exports = {
    buildSiteTree,
    canonicalName,
    createTemplateChooser,
    isFile,
};