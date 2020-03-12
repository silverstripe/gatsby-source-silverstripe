const handleSchemaCustomization = ({ actions }) => {
    const { createTypes } = actions
    const typeDefs = `
      type SSSiteTree implements Node{
        Children: [SSSiteTree]
      }
    `
    createTypes(typeDefs)
};

module.exports = handleSchemaCustomization;