import { CreateSchemaCustomizationArgs, GatsbyNode } from "gatsby"
import { Hash, PluginConfig } from "../types"
import { getState } from "../buildState"

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] = async (
  args: CreateSchemaCustomizationArgs,
  pluginConfig: PluginConfig
) => {
  const { actions } = args
  const { createTypes, createFieldExtension } = actions
  // Adds a directive to specify that a field is pre-sorted and unfilterable.
  createFieldExtension({
    name: `serialised`,
    extend() {
      return {
        resolve(source: Hash, args: Hash, context: Hash, resolveInfo: Hash) {
          return source[resolveInfo.fieldName]
            .map((id: string) => context.nodeModel.getNodeById(id))
            .filter((r: object) => r)
        },
      }
    },
  })

  const schema = getState().schema
  createTypes(schema)
}
