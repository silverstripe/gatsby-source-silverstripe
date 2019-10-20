const handleSchemaCustomization = ({ actions }) => {
    const { createTypes } = actions
    const typeDefs = `
      type SilverStripeDataObject implements Node {
        SilverStripeSiteTree: SilverStripeDataObjectSilverStripeSiteTree
      }
      type SilverStripeDataObjectSilverStripeSiteTree {
        Children: [SilverStripeDataObject]
      }
    `
    createTypes(typeDefs)
};

module.exports = handleSchemaCustomization;