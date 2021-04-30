import { GatsbyNode, ParentSpanPluginArgs } from "gatsby"
import { PluginConfig } from "../types"
import { __typename, fetch } from "../buildState"
import { processNodes } from "../utils/processNodes"
import PQueue from "p-queue"

const syncQuery: string = `
query Sync(
    $limit: Int!,
    $offset: Int!,
    $since: Int!,
    $stage: VersionedStage!
) {
    sync (limit: $limit, offset: $offset, since: $since, stage: $stage)
}
`

export const sourceNodes: GatsbyNode["sourceNodes"] = async (
  args: ParentSpanPluginArgs,
  pluginConfig: PluginConfig
) => {
  const { actions, reporter, cache, getNodes } = args
  const { touchNode } = actions
  const { batchSize, stage } = pluginConfig

  let offset = 0

  reporter.info(`Beginning Silverstripe CMS fetch in batches of ${batchSize}`)
  let timestamp: number = (await cache.get(`lastFetch`)) ?? 0

  if (timestamp > 0) {
    const date = new Date(timestamp * 1000)
    reporter.info(`Delta fetching since [${date}]`)

    // Ensure existing nodes aren't garbage collected
    getNodes().forEach(node => {
      if (node.internal.owner !== `gatsby-source-silverstripe`) {
        return
      }
      touchNode(node)
    })
  } else {
    reporter.info(`This is a full content fetch. It may take a while...`)
  }
  const variables = {
    limit: batchSize,
    offset,
    since: timestamp,
    stage,
  }

  const data = await fetch(syncQuery, variables)

  if (data.errors && data.errors.length) {
    reporter.panic(
      `Silverstripe CMS source plugin could not fetch. Errors: `,
      data.errors
    )
  }

  const {
    data: {
      sync: { totalCount, results },
    },
  } = data

  reporter.info(`Found ${totalCount} nodes to sync.`)

  processNodes(args, results, pluginConfig.apiKey)

  if (totalCount > batchSize) {
    let remaining = totalCount - batchSize
    const numberOfBatches = Math.ceil(remaining / batchSize)
    const { concurrentRequests } = pluginConfig

    reporter.info(
      `Multiple fetches required. Using concurrency of ${concurrentRequests} for ${numberOfBatches} remaining fetches.`
    )

    const queue = new PQueue({ concurrency: concurrentRequests })
    const pages = [...Array(numberOfBatches).keys()]

    pages.forEach(pageNumber => {
      queue.add(async () => {
        const offset = (pageNumber + 1) * batchSize
        const response = await fetch(syncQuery, {
          ...variables,
          offset,
        })
        if (response.errors && response.errors.length) {
          reporter.panic(`
Sync failed at query:
    ${JSON.stringify(variables)}
    offset ${offset}}
Got errors: ${JSON.stringify(response.errors)}
                    `)
        }
        const {
          data: {
            sync: { results },
          },
        } = response
        processNodes(args, results, pluginConfig.apiKey)
        Promise.resolve()
      })
      remaining -= batchSize
    })

    let count = 0

    const activity = reporter.activityTimer(
      `Fetching from Silverstripe CMS GraphQL API:`
    )
    activity.start()

    queue.on(`active`, () => {
      count++
      const pct = Math.ceil((count / numberOfBatches) * 100)
      activity.setStatus(
        `[${pct}%] (${numberOfBatches - count} batches remaining)`
      )
    })
    await queue.onIdle()
    activity.setStatus(`[100%] (0 batches remaining)`)
    activity.end()
  }

  const stamp = Math.floor(Date.now() / 1000)
  await cache.set(`lastFetch`, stamp)
  await cache.get(`lastFetch`)
}
