import nodeFetch, { Response } from "node-fetch"
import { FetchFunction } from "../buildState"
import { Hash } from "../types"

class HTTPResponseError extends Error {
  response: Response
  constructor(response: Response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`)
    this.response = response
  }
}

const checkStatus = (response: Response) => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response
  } else {
    console.log(response)
    throw new HTTPResponseError(response)
  }
}

export const createFetch = (
  endpoint: string,
  apiKey: string
): FetchFunction => async (
  query: string,
  variables: Hash = {}
): Promise<Hash> => {
  const response = await nodeFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })
  try {
    checkStatus(response)
  } catch (error) {
    console.log(error)
    const errorBody = await error.response.text()
    throw new Error(errorBody)
  }
  const data = await response.json()

  return data
}
