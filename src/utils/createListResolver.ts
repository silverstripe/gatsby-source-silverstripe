import { Hash, Schema } from "../types"
import { getDefaultSortForType } from "./getDefaultSortForType"

export function createListResolver(
  field: Hash,
  typeName: string,
  schema: Schema
): Function {
  return function (source: Hash, args: Hash, context: Hash, info: Hash) {
    if (!Array.isArray(source[field.name])) {
      return null
    }
    const entries: { id: string }[] = source[field.name]
    const ids = entries.map(o => o.id)
    return context.nodeModel.runQuery({
      query: {
        filter: {
          ...(args.filter ?? {}),
          id: { in: ids },
        },
        sort: args.sort ?? getDefaultSortForType(schema, typeName),
        skip: args.skip ?? null,
        limit: args.limit ?? null,
      },
      type: typeName,
      firstOnly: false,
    })
  }
}
