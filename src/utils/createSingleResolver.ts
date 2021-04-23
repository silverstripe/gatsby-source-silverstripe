import { Hash, Schema } from "../types"

export function createSingleResolver(
  field: Hash,
  typeName: string,
  schema: Schema
): Function {
  return function (source: Hash, args: Hash, context: Hash) {
    if (!source[field.name].id) {
      return null
    }
    return context.nodeModel.getNodeById({
      id: source[field.name].id,
      type: typeName,
    })
  }
}
