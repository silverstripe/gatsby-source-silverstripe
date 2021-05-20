import { NodeInput, ParentSpanPluginArgs } from "gatsby"
import { __typename } from "../buildState"
import { createRemoteFileNode } from "gatsby-source-filesystem"
import { NodeResult, Relation, RelationStub } from "../types"

interface SyncResult {
  updates: Array<NodeResult>
  deletes: Array<string>
}

/**
 * Because most queries return interfaces, there isn't enough in { id: 'abc123' } alone to inform
 * the resolveType() function on the interface, so we need to load it up with
 * { internal: { type: prefixedTypeName } }
 *
 * @param value RelationStub
 * @returns Relation | RelationStub
 */
const updateRelationStub = (value: RelationStub): Relation | RelationStub => {
  const keys = Object.keys(value)
  if (
    keys.length !== 2 ||
    !keys.includes(`id`) ||
    !keys.includes(`__typename`)
  ) {
    return value
  }
  return {
    id: value.id,
    internal: {
      type: __typename(value.__typename),
    },
  }
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
        nodeData.localFile = {
          id: attachedFileID,
          internal: { type: __typename(`File`) },
        }
        createNode(nodeData)

        try {
          await createRemoteFileNode({
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
        } catch (e) {
          reporter.warn(`Failed to fetch file ${url}. Got error ${e}`)
        }
      }
    } else {
      for (const fieldName in nodeData) {
        const value = nodeData[fieldName]
        if (!value || typeof value !== "object" || !Array.isArray(value)) {
          continue
        }

        if (Array.isArray(value)) {
          nodeData[fieldName] = value.map(updateRelationStub)
        } else {
          nodeData[fieldName] = updateRelationStub(value)
        }
      }
      createNode(nodeData)
    }
  }
  results.deletes.forEach(nodeId => {
    deleteNode(getNode(nodeId))
  })
}
