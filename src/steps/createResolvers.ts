import { CreateResolversArgs, GatsbyNode } from "gatsby"
import { Hash, Schema } from "../types"
import { getState } from "../buildState"
import { getDefaultSortForType } from "../utils/getDefaultSortForType"
import { applyDefaultSort } from "../utils/applyDefaultSort"
import { createDefaultArgs } from "../utils/createDefaultArgs"
import { createListResolver } from "../utils/createListResolver"
import { createSingleResolver } from "../utils/createSingleResolver"

export const createResolvers: GatsbyNode["createResolvers"] = (
  args: CreateResolversArgs
): any => {
  const { createResolvers, intermediateSchema } = args
  const schema = intermediateSchema as Schema
  const resolvers: Hash = {
    Query: {},
  }

  const queryType = schema.getType(`Query`)
  const queryFields = queryType ? queryType.getFields() : {}
  const queryFieldNames = Object.keys(queryFields)

  getState().types.forEach(typeName => {
    const type = schema.getType(typeName)
    if (!type || type.constructor.name !== "GraphQLObjectType") {
      return
    }

    const defaultSort = getDefaultSortForType(schema, typeName)

    if (defaultSort) {
      applyDefaultSort(typeName, queryFields, queryFieldNames, defaultSort)
    }

    const allFields = type.getFields()
    const fieldNames = Object.keys(allFields)
    const fieldResolvers: {
      [key: string]: unknown
    } = {}
    fieldNames.forEach(fieldName => {
      const field = allFields[fieldName]
      // If the field is pre sorted and unfilterable, the resolver is
      // handled by the extension
      if (field?.extensions?.serialised) {
        return
      }

      const fullType = field.type.toString()
      const namedType = fullType.replace(/[^A-Za-z0-9_]+/g, "")
      const isList = fullType.startsWith(`[`)
      if (namedType && getState().types.includes(namedType)) {
        const namedTypeToFetch = namedType.replace(
          /InheritanceUnion$/,
          "Interface"
        )
        if (isList) {
          fieldResolvers[field.name] = {
            args: createDefaultArgs(namedTypeToFetch),
            resolve: createListResolver(field, namedTypeToFetch, schema),
          }
        } else {
          fieldResolvers[field.name] = {
            resolve: createSingleResolver(field, namedTypeToFetch, schema),
          }
        }
      }
    })
    resolvers[type.name] = fieldResolvers
  })

  // Handle file relationships
  getState().files.forEach(fileTypeName => {
    resolvers[fileTypeName] = {
      ...resolvers[fileTypeName],
      localFile: {
        resolve(source: Hash, args: Hash, context: Hash) {
          if (!source.localFile.id) {
            return null
          }
          return context.nodeModel.getNodeById({
            id: source.localFile.id,
            type: `File`,
          })
        },
      },
    }
  })

  createResolvers(resolvers)
}
