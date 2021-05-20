import { Hash, Schema } from "../types"
import { getDefaultSortForType } from "./getDefaultSortForType"

export function createListResolver(
  field: Hash,
  typeName: string,
  schema: Schema
): Function {
  return function (source: Hash, args: Hash, context: Hash, info: Hash) {
    const entries: { id: string }[] = source[field.name]
    const ids = entries.map(o => o.id)
    const fs = require("fs")
    const log_file = fs.createWriteStream(`/tmp/debug.log`, { flags: "w" })

    if (!Array.isArray(source[field.name])) {
      log_file.write(`${field.name} is not an array\n\n`)
      return null
    }
    log_file.write(
      JSON.stringify(`querying ${typeName}, ${JSON.stringify(ids)}`) + "\n\n"
    )
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
