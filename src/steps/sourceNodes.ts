import { GatsbyNode, ParentSpanPluginArgs } from "gatsby"
import { PluginConfig } from "../types"
import { __typename, fetch } from "../buildState"
import { processNodes } from "../utils/processNodes"
import PQueue from "p-queue"
import { processFiles } from "../utils/processFiles"
import _ from "lodash"
import { downloadFiles } from "../utils/downloadFiles"
import chalk from "chalk"

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
interface SSWebhook {
  since?: number
  clear?: number
}

const getTimestampFromWebhook = (data: SSWebhook): number | null => {
  const validKeys = [`clear`, `since`]
  const keys = Object.keys(data)
  if (keys.length > 1) {
    throw new Error(
      `Invalid webhook. Must only contain "since" or "clear" in the JSON payload`
    )
  }
  keys.forEach(k => {
    if (!validKeys.includes(k)) {
      throw new Error(`Invalid webhook. Key ${k} is not allowed`)
    }
  })

  if (data.clear) {
    return 0
  } else if (data.since) {
    return data.since
  }

  return null
}

export const sourceNodes: GatsbyNode["sourceNodes"] = async (
  args: ParentSpanPluginArgs,
  pluginConfig: PluginConfig
) => {
  const { actions, reporter, cache, getNodes, webhookBody } = args
  const { touchNode } = actions
  const { batchSize, stage } = pluginConfig

  let offset = 0

  reporter.info(`Beginning Silverstripe CMS fetch in batches of ${batchSize}`)

  const webhookData = webhookBody as SSWebhook
  let timestamp = getTimestampFromWebhook(webhookData)

  if (timestamp !== null) {
    reporter.info(
      timestamp === 0
        ? chalk.blueBright(`[WEBHOOK]: Clearing all data`)
        : chalk.blueBright(
            `[WEBHOOK]: Custom fetch from ${new Date(timestamp * 1000)}`
          )
    )
  } else {
    timestamp = (await cache.get(`lastFetch`)) ?? 0
  }

  if (timestamp && timestamp > 0) {
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
  ;``
  const {
    data: {
      sync: { totalCount, results },
    },
  } = data

  reporter.info(`Found ${totalCount} nodes to sync.`)

  let files = new Map()
  files = new Map([...files, ...processFiles(args, results)])

  await processNodes(args, results)

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
          reporter.panic(reporter.stripIndent`
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
        files = new Map([...files, ...processFiles(args, results)])
        await processNodes(args, results)
        Promise.resolve(results)
      })
      remaining -= batchSize
    })

    const progress = reporter.createProgress(
      `Fetching content from Silverstripe CMS GraphQL API:`,
      numberOfBatches
    )
    progress.start()
    let count = 0
    queue.on(`active`, () => {
      progress.tick()
      progress.setStatus(
        `Working on batch #${++count}.  Size: ${queue.size}  Pending: ${
          queue.pending
        }`
      )
    })
    await queue.onIdle()
    progress.setStatus(`Done!`)
    progress.done()
  }

  if (files.size > 0) {
    reporter.info(`Downloading ${files.size} files...`)
    await downloadFiles(files, args, pluginConfig)
  }

  const stamp = Math.floor(Date.now() / 1000)
  await cache.set(`lastFetch`, stamp)
  await cache.get(`lastFetch`)
}
