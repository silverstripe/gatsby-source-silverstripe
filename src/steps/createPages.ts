import { CreatePagesArgs, GatsbyNode } from "gatsby"
import { InternalNodeResult, PluginConfig } from "../types"
import { createTemplateChooser } from "../utils/createTemplateChooser"

interface PageResult {
  allSsSiteTreeInterface: {
    nodes: Array<InternalNodeResult>
  }
}

export const createPages: GatsbyNode["createPages"] = async (
  args: CreatePagesArgs,
  pluginConfig: PluginConfig
) => {
  const { graphql, actions, reporter } = args
  const prefix = pluginConfig.typePrefix
  const chooseTemplate = createTemplateChooser([`src/templates`], prefix)
  const result = await graphql<PageResult>(`
    query {
      allSsSiteTreeInterface {
        nodes {
          id
          link
          typeAncestry
          internal {
            type
          }
        }
      }
    }
  `)
  if (!result || !result.data) {
    return
  }

  result.data.allSsSiteTreeInterface.nodes.forEach(node => {
    const component = chooseTemplate(node)
    if (!component) {
      reporter.warn(
        `No template found for node ${node.internal.type}. Skipping`
      )
      return
    }
    if (node.link) {
      actions.createPage({
        path: node.link,
        component,
        context: {
          id: node.id,
        },
      })
    }
  })
}
