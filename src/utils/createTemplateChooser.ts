import nodePath from "path"
import { NodeResult } from "../types"
import glob from "fast-glob"

export type chooserFn = (page: NodeResult) => string | null

let templateCache = new Map()

export const createTemplateChooser = (
  path: string,
  prefix: string = ""
): chooserFn => {
  const absPath = nodePath.join(process.cwd(), path)

  return ({ typeAncestry }): string | null => {
    const identifier = `${JSON.stringify(typeAncestry)}`
    const cached = templateCache.get(identifier)
    if (cached) {
      return cached
    }

    const candidates = typeAncestry.map(t =>
      t[0].replace(new RegExp(`^${prefix}`), ``)
    )
    let candidate = candidates.reverse().pop()

    const findPath = (templateName: string): string | null => {
      const result = glob.sync(`${absPath}/**/${templateName}.{js,jsx,tsx}`)
      if (!result.length) {
        return null
      }

      const templatePath = result[0]
      templateCache.set(identifier, templatePath)

      if (result.length > 1) {
        console.warn(
          `Multiple templates found for ${templateName}. Using the first one: ${templatePath}`
        )
      }

      return templatePath
    }

    while (candidate) {
      const templatePath = findPath(candidate)

      if (templatePath) {
        return templatePath
      }

      candidate = candidates.pop()
    }
    return null
  }
}

export function clearCache(): void {
  templateCache = new Map()
}
