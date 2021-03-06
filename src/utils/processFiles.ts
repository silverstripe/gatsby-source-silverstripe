import { ParentSpanPluginArgs } from "gatsby"
import { ProcessedFileTuple, SyncResult } from "../types"
import { __typename } from "../buildState"

export const processFiles = (
  args: ParentSpanPluginArgs,
  results: SyncResult
): Map<string, ProcessedFileTuple> => {
  const { reporter, createNodeId } = args
  const files: Map<string, ProcessedFileTuple> = new Map()

  for (const result of results.updates) {
    const isFile = result.typeAncestry.some((a: string) => a[0] === `File`)
    if (!isFile) {
      continue
    }

    const url = result.absoluteLink
    const hash = result.fileHash as string
    const filename = result.fileFilename as string

    if (!url) {
      reporter.warn(
        `Silverstripe file has no URL. Silverstripe ID: ${result.ssid} (${result.name})`
      )
    } else {
      delete result.link
      delete result.absoluteLink
      delete result.fileFilename
      delete result.fileHash

      const attachedFileID = createNodeId(url)
      result.localFile = {
        id: attachedFileID,
        internal: {
          type: __typename(`File`),
        },
      }
      files.set(attachedFileID, [url, hash, filename])
    }
  }
  return files
}
