import { DefaultSort, Hash } from "../types"
import { removeNulls } from "../utils/removeNulls"

export function applyDefaultSort(
  typeName: string,
  queryFields: Hash,
  queryFieldNames: Array<string>,
  defaultSort: DefaultSort
): void {
  const typeQueryName = queryFieldNames.find(
    name => queryFields[name].type.toString() === `${typeName}Connection!`
  )
  const interfaceQueryName = queryFieldNames.find(
    name =>
      queryFields[name].type.toString() === `${typeName}InterfaceConnection!`
  )
  const queries = [typeQueryName, interfaceQueryName].filter(removeNulls)
  queries.forEach(queryName => {
    const sortArg = queryFields[queryName].args.find(
      (arg: Hash) => arg.name === "sort"
    )
    if (!sortArg) {
      return
    }
    sortArg.defaultValue = defaultSort
  })
}
