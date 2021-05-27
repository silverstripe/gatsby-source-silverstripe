import { GatsbyNode, PluginOptionsSchemaArgs } from "gatsby"
import systemPath from "path"
import { existsSync } from "fs"
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

    concurrentRequests: Joi.number().integer().max(50).min(1).default(5),

    typePrefix: Joi.string().default("SS_"),

    stage: Joi.string().valid("DRAFT", "LIVE").default("DRAFT"),

    logFile: Joi.string().default(systemPath.join(process.cwd(), `debug.log`)),

    templatesPath: Joi.string()
      .default(`src/templates`)
      .custom((val: string) => {
        const path = systemPath.join(process.cwd(), val)
        if (!existsSync(path)) {
          throw new Error(`Template path ${path} does not exist`)
        }
      }),

    hardCacheAssets: Joi.boolean().default(true).description(`
        If true, cache the downloaded assets outside the Gatsby cache
        directory to prevent them from being redownloaded, even after
        clearing the Gatsby cache for a full build. Only works if your
        assets are colocated with your CMS instance. Do not use this option
        if you host your uploaded assets on a CDN.
      `),
  })
}
