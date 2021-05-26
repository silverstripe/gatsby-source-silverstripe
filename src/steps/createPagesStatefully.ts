import { CreatePagesArgs, GatsbyNode, PluginCallback } from "gatsby"
import { Hash, InternalNodeResult, PluginConfig } from "../types"
import glob from "fast-glob"
import systemPath from "path"
import { __typename, getState } from "../buildState"
import { camelCase } from "lodash"
import { existsSync } from "fs"
import watch from "node-watch"
import { buildPage } from "../utils/buildPage"
import { clearCache } from "../utils/createTemplateChooser"
import chalk from "chalk"

export const createPagesStatefully: GatsbyNode["createPages"] = async (
  args: CreatePagesArgs,
  pluginConfig: PluginConfig,
  doneCb: PluginCallback
): Promise<void> => {
  const {
    graphql,
    actions: { createPage, deletePage },
    reporter,
    cache,
    store,
  } = args
  const { templatesPath } = pluginConfig
  const absTemplatePath = systemPath.resolve(process.cwd(), templatesPath)
  const pagesGlob = `**/*.{js,jsx,tsx}`

  const getChangedFiles = async (): Promise<Set<string>> => {
    const prevFiles = await cache.get(`ssTemplateManifest`)
    if (!prevFiles) {
      return new Set()
    }
    const currentFiles = await glob.sync(`${absTemplatePath}/${pagesGlob}`)
    const prevManifest: Set<string> = new Set(prevFiles)
    const currentManifest: Set<string> = new Set(currentFiles)

    const deletedTemplates = new Set(
      [...prevManifest].filter(x => !currentManifest.has(x))
    )
    const addedTemplates = new Set(
      [...currentManifest].filter(x => !prevManifest.has(x))
    )

    return new Set([...addedTemplates, ...deletedTemplates])
  }

  const persistFiles = async (): Promise<void> => {
    const currentFiles = await glob.sync(`${absTemplatePath}/${pagesGlob}`)
    await cache.set(`ssTemplateManifest`, currentFiles)
  }

  // Handles changes to template files
  const fileUpdateHandler = async () => {
    try {
      const changedFiles = await getChangedFiles()
      if (!changedFiles.size) {
        return
      }
      const types = getState().types
      for (const path of [...changedFiles]) {
        const isDelete = !existsSync(path)
        const typeName = systemPath.parse(path).name
        const localTypeName = __typename(typeName)
        if (!types.includes(localTypeName)) {
          !isDelete &&
            reporter.warn(
              `File ${path} is in the templates directory and does not map to a type`
            )
          continue
        }

        const localInterfaceName = `${localTypeName}Interface`
        // Find any node that is affected by this new template
        const queryName = camelCase(`all ${localInterfaceName}`)
        const siteTreeInterface = __typename(`SiteTreeInterface`)
        const result = await graphql<Hash>(`
              query {
                  ${queryName} {
                      nodes {
                          ... on ${siteTreeInterface} {
                              id
                              link
                              typeAncestry
                          }
                      }
                  }
              }
          `)

        if (result && result.data) {
          clearCache()
          const nodes: Array<InternalNodeResult> = result.data[queryName].nodes
          nodes.forEach(node => {
            if (node.link) {
              const currentPage = store.getState().pages.get(node.link)
              if (currentPage) {
                deletePage({
                  path: node.link,
                  component: currentPage.component,
                })
                const newComponent = buildPage(node, {
                  pageCreator: createPage,
                  reporter,
                })

                newComponent &&
                  reporter.info(reporter.stripIndent`
                    Replacing page component at ${node.link}.
                    Old component: ${chalk.red(currentPage.component)}
                    New component: ${chalk.green(newComponent)} 
                  `)
              }
            }
          })
        }
      }

      await persistFiles()
    } catch (e) {
      reporter.panic(e.message)
    }
  }

  fileUpdateHandler()

  // During dev, watch the templates directory so we can keep updated
  const watcher = watch(absTemplatePath, { recursive: true })

  return new Promise<void>(resolve => {
    watcher.on(`change`, fileUpdateHandler)
    watcher.on(`ready`, () => {
      persistFiles()
      resolve()
    })
  }).then(() => doneCb(null, null))
}
