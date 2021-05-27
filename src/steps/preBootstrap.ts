import { GatsbyNode, ParentSpanPluginArgs } from "gatsby"
import { PluginConfig } from "../types"
import { URL as urlObject } from "url"
import {
  setFetch,
  fetch,
  getState,
  setTemplateChooser,
  setTypenameHandler,
  getHardCacheDir,
} from "../buildState"
import { createFetch } from "../utils/createFetch"
import { createTemplateChooser } from "../utils/createTemplateChooser"
import fs from "fs"

// Builds the global state that will be used throughout the build, including
// some helper functions that vary based on config

export const onPreBootstrap: GatsbyNode["onPreBootstrap"] = async (
  args: ParentSpanPluginArgs,
  pluginOptions: PluginConfig
) => {
  const state = getState()

  // Typename helper
  const {
    typePrefix,
    graphqlEndpoint,
    baseUrl,
    apiKey,
    templatesPath,
  } = pluginOptions
  setTypenameHandler(type => `${typePrefix}${type}`)

  // Ensure the /.silverstripe-cache folder exists
  if (!fs.existsSync(getHardCacheDir())) {
    fs.mkdirSync(getHardCacheDir())
  }

  // Fetcher
  const endpoint = new urlObject(graphqlEndpoint, baseUrl).toString()
  setFetch(createFetch(endpoint, apiKey))

  // Template chooser
  setTemplateChooser(createTemplateChooser(templatesPath, typePrefix))

  // Get the schema in memory
  const query = `
        query { schema(prefix: "${typePrefix}" ) }
    `
  const result = await fetch(query)
  const {
    data: {
      schema: { schema, types, files },
    },
  } = result

  state.schema = schema
  state.types = types
  state.files = files
}
