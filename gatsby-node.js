const handlePreBootstrap = require('./src/build/handlePreBootstrap');
const handleSourceNodes = require('./src/build/handleSourceNodes');
//const handleSchemaCustomization = require('./src/build/handleSchemaCustomization');

exports.onPreBootstrap = handlePreBootstrap;
exports.sourceNodes = handleSourceNodes;
exports.createSchemaCustomization = ({ actions, schema }) => {
    console.log('**** customising schema ****');
    const { createTypes } = actions
    const typeDefs = [
      schema.buildInterfaceType({
          name: "SiteTreeInterface",
          fields: {
              title: "String",
              content: "String"
          }
      }),
      schema.buildObjectType({
        name: "SSPage",
        interfaces: ["Node", "SiteTreeInterface"],
      }),
    ]
    createTypes(typeDefs)
};

