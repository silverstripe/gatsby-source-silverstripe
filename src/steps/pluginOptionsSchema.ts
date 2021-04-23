import { GatsbyNode, PluginOptionsSchemaArgs } from "gatsby"

export const pluginOptionsSchema: GatsbyNode["pluginOptionsSchema"] = (
  args: PluginOptionsSchemaArgs
) => {
  const { Joi } = args
  return Joi.object({
    baseUrl: Joi.string().uri().required().description(`
            The absolute base URL to your Silverstripe CMS installation, excluding the graphql suburl,
            e.g. https://mywebsite.com
        `),
    graphqlEndpoint: Joi.string().default(`__gatsby/graphql`).description(`
            The pathname to your gatsby graphql server endpoint, e.g. __gatsby/graphql
        `),
    apiKey: Joi.string().required().description(`
                The API key from your Silverstripe CMS member. Find this in the Security section, on 
                the "Api keys" tab for the member you want to use for authentication (should be an administrator)
            `),
    batchSize: Joi.number().integer().max(1000).min(1).default(100),
    concurrentRequests: Joi.number().integer().max(20).min(1).default(5),
    typePrefix: Joi.string().default("SS_"),
    stage: Joi.string().valid("DRAFT", "LIVE").default("DRAFT"),
    forceRefresh: Joi.boolean()
      .falsy(0, "N", "no", "No", "0", "false")
      .truthy(1, "Y", "yes", "Yes", "1", "true")
      .default(false),
  })
}
