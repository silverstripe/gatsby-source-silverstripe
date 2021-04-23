import { GatsbyNode, ParentSpanPluginArgs } from "gatsby"
import { PluginConfig } from "../types"
import { setTypenameHandler } from "../buildState"
import { URL as urlObject } from "url"
import { setFetch, fetch, getState } from "../buildState"
import { createFetch } from "../utils/createFetch"

// Builds the global state that will be used throughout the build, including
// some helper functions that vary based on config

export const onPreBootstrap: GatsbyNode["onPreBootstrap"] = async (
  args: ParentSpanPluginArgs,
  pluginOptions: PluginConfig
) => {
  const state = getState()

  // Typename helper
  const { typePrefix, graphqlEndpoint, baseUrl, apiKey } = pluginOptions
  setTypenameHandler(type => `${typePrefix}${type}`)

  // Fetcher
  const endpoint = new urlObject(graphqlEndpoint, baseUrl).toString()
  setFetch(createFetch(endpoint, apiKey))

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
