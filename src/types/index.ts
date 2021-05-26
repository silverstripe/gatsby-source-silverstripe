import { PluginOptions } from "gatsby"
import { GraphQLObjectType } from "graphql"

export interface Hash {
  [key: string]: any
}

export interface PluginConfig extends PluginOptions {
  baseUrl: string
  graphqlEndpoint: string
  apiKey: string
  batchSize: number
  concurrentRequests: number
  typePrefix: string
  stage: string
  forceRefresh: boolean
  templatesPath: string
  hardCacheAssets: boolean

}

export interface NodeResult {
  id: string
  typeAncestry: Array<string>
  absoluteLink?: string | null
  link?: string | null
  [key: string]: unknown
}

export interface InternalNodeResult extends NodeResult {
  internal: {
    type: string
  }
}

export interface DefaultSort {
  order: Array<string>
  fields: Array<string>
}

export interface Schema {
  getType: (typeName: string) => GraphQLObjectType | null
}

export interface RelationStub {
  id: string
  __typename: string
}

export interface Relation {
  id: string
  internal: {
    type: string
  }
}

export interface SyncResult {
  updates: Array<NodeResult>
  deletes: Array<string>
}

export type ProcessedFileTuple = [ string, string, string ]

