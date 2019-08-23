const contentful = require(`contentful`)
const _ = require(`lodash`)
const chalk = require(`chalk`)
const normalize = require(`./normalize`)
const { formatPluginOptionsForCLI } = require(`./plugin-options`)

module.exports = async ({ syncToken, reporter, pluginConfig }) => {
  // Fetch articles.
  console.time(`Fetch SilverStripe data`)

  console.log(`Starting to fetch data from SilverStripe`)

  const contentfulClientOptions = {
    space: pluginConfig.get(`spaceId`),
    accessToken: pluginConfig.get(`accessToken`),
    host: pluginConfig.get(`host`),
    environment: pluginConfig.get(`environment`),
  }

  const client = contentful.createClient(contentfulClientOptions)



  let currentSyncData
  try {
    let query = syncToken ? { nextSyncToken: syncToken } : { initial: true }
    currentSyncData = await client.sync(query)
  } catch (e) {
    reporter.panic(`Fetching SilverStripe data failed`, e)
  }

  // We need to fetch content types with the non-sync API as the sync API
  // doesn't support this.
  let contentTypes
  try {
    contentTypes = await pagedGet(client, `getContentTypes`)
  } catch (e) {
    console.log(`error fetching content types`, e)
  }
  console.log(`contentTypes fetched`, contentTypes.items.length)

  let contentTypeItems = contentTypes.items

  // Fix IDs on entries and assets, created/updated and deleted.
  contentTypeItems = contentTypeItems.map(c => normalize.fixIds(c))

  currentSyncData.entries = currentSyncData.entries.map(e => {
    if (e) {
      return normalize.fixIds(e)
    }
    return null
  })
  currentSyncData.assets = currentSyncData.assets.map(a => {
    if (a) {
      return normalize.fixIds(a)
    }
    return null
  })
  currentSyncData.deletedEntries = currentSyncData.deletedEntries.map(e => {
    if (e) {
      return normalize.fixIds(e)
    }
    return null
  })
  currentSyncData.deletedAssets = currentSyncData.deletedAssets.map(a => {
    if (a) {
      return normalize.fixIds(a)
    }
    return null
  })

  const result = {
    currentSyncData,
    contentTypeItems,
    defaultLocale,
    locales,
  }

  return result
}

/**
 * Gets all the existing entities based on pagination parameters.
 * The first call will have no aggregated response. Subsequent calls will
 * concatenate the new responses to the original one.
 */
function pagedGet(
  client,
  method,
  query = {},
  skip = 0,
  pageLimit = 1000,
  aggregatedResponse = null
) {
  return client[method]({
    ...query,
    skip: skip,
    limit: pageLimit,
    order: `sys.createdAt`,
  }).then(response => {
    if (!aggregatedResponse) {
      aggregatedResponse = response
    } else {
      aggregatedResponse.items = aggregatedResponse.items.concat(response.items)
    }
    if (skip + pageLimit <= response.total) {
      return pagedGet(
        client,
        method,
        query,
        skip + pageLimit,
        pageLimit,
        aggregatedResponse
      )
    }
    return aggregatedResponse
  })
}
