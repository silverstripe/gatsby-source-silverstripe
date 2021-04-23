import { NodeInput, ParentSpanPluginArgs } from "gatsby"
import { __typename } from "../buildState"
import { createRemoteFileNode } from "gatsby-source-filesystem"
import { NodeResult } from "../types"

interface SyncResult {
  updates: Array<NodeResult>
  deletes: Array<string>
}

export const processNodes = async (
  args: ParentSpanPluginArgs,
  results: SyncResult,
  apiKey: string
): Promise<void> => {
  const {
    createContentDigest,
    createNodeId,
    reporter,
    store,
    cache,
    getNode,
    actions: { createNode, deleteNode },
  } = args
  for (const result of results.updates) {
    const [typeName, typeID] = result.typeAncestry[0]
    const nodeData: NodeInput = {
      ...result,
      id: typeID,
      internal: {
        type: __typename(typeName),
        contentDigest: createContentDigest(result),
      },
      localFile: null,
    }
    const isFile = result.typeAncestry.some((a: string) => a[0] === `File`)
    if (isFile) {
      const url = result.absoluteLink
      if (!url) {
        reporter.warn(
          `Silverstripe file has no URL. Skipping: ${JSON.stringify(result)}`
        )
      } else {
        delete result.link
        delete result.absoluteLink

        const attachedFileID = createNodeId(`${nodeData.id}--${url}`)
        nodeData.localFile = { id: attachedFileID }
        createNode(nodeData)

        createRemoteFileNode({
          url,
          parentNodeId: nodeData.id,
          cache,
          createNode,
          createNodeId() {
            return attachedFileID
          },
          reporter,
          store,
          httpHeaders: { "X-API-KEY": apiKey },
        })
      }
    } else {
      createNode(nodeData)
    }
  }
  results.deletes.forEach(nodeId => {
    deleteNode(getNode(nodeId))
  })
}
