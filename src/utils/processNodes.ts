import { NodeInput, ParentSpanPluginArgs } from "gatsby"
import { __typename } from "../buildState"
import { SyncResult, Relation, RelationStub } from "../types"


/**
 * Because most queries return interfaces, there isn't enough in { id: 'abc123' } alone to inform
 * the resolveType() function on the interface, so we need to load it up with
 * { internal: { type: prefixedTypeName } }
 * 
 * @param value RelationStub
 * @returns Relation | RelationStub
 */
const updateRelationStub = (value: RelationStub): Relation | RelationStub => {
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes(`id`) || !keys.includes(`__typename`)) {
    return value
  }
  return {
    id: value.id,
    internal: {
      type: __typename(value.__typename),
    }
  }
};

export const processNodes = async (
  args: ParentSpanPluginArgs,
  results: SyncResult,
): Promise<void> => {
  const {
    createContentDigest,
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
    }
    for (const fieldName in nodeData) {
      const value = nodeData[fieldName];
      if (!value || typeof value !== 'object' || !Array.isArray(value)) {
        continue;
      }
      
      if (Array.isArray(value)) {
        nodeData[fieldName] = value.map(updateRelationStub)
      } else {
        nodeData[fieldName] = updateRelationStub(value)
      }
    }
    createNode(nodeData)
  }

  results.deletes.forEach(nodeId => {
    deleteNode(getNode(nodeId))
  })
}
