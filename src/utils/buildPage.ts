import { InternalNodeResult } from "../types"
import { chooseTemplate } from "../buildState"
import { Reporter } from "gatsby"

export const buildPage = (
  node: InternalNodeResult,
  args: {
    pageCreator: Function
    reporter: Reporter
  }
): string | null | undefined => {
  const component = chooseTemplate(node)
  const { reporter, pageCreator } = args
  if (!component) {
    reporter.warn(`No template found for node ${node.internal.type}. Skipping`)
    return null
  }
  if (node.link) {
    pageCreator({
      path: node.link,
      component,
      context: {
        id: node.id,
      },
    })
  }

  return component
}
