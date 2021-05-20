import { CreatePagesArgs, GatsbyNode } from "gatsby"
import { InternalNodeResult } from "../types"
import { __typename } from "../buildState"
import { buildPage } from "../utils/buildPage"

interface PageResult {
  allSsSiteTreeInterface: {
    nodes: Array<InternalNodeResult>
  }
}

export const createPages: GatsbyNode["createPages"] = async (
  args: CreatePagesArgs
): Promise<void> => {
  const {
    graphql,
    reporter,
    actions: { createPage },
  } = args
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
    buildPage(node, { pageCreator: createPage, reporter })
  })
}
