import { ArgumentNode, StringValueNode } from "graphql"
import { DefaultSort, Hash, Schema } from "../types"

export function getDefaultSortForType(
  schema: Schema,
  typeName: string
): DefaultSort | null {
  const type = schema.getType(typeName)
  if (!type) {
    return null
  }
  const directive = type?.astNode?.directives?.find(
    (d: Hash) => d.name.value === "defaultSort"
  )
  if (!directive) {
    return null
  }
  const col = directive?.arguments?.find(
    (arg: ArgumentNode) => arg.name.value === "column"
  )
  const dir = directive?.arguments?.find(
    (arg: ArgumentNode) => arg.name.value === "direction"
  )

  if (!col || !dir) {
    return null
  }

  const order = dir.value as StringValueNode
  const field = col.value as StringValueNode

  return {
    order: [order.value],
    fields: [field.value],
  }
}
