import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/collections.ts */

export async function retrieveCollection(
  event: H3Event,
  id: string
): Promise<HttpTypes.StoreCollection> {
  const sdk = useMedusa()

  return withCache(event, "collections", `/store/collections/${id}`, () =>
    sdk.client.fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {}
    )
  ).then(({ collection }) => collection)
}

/**
 * NOTE (Next parity): `count` is the fetched page length, NOT the API total.
 */
export async function listCollections(
  event: H3Event,
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> {
  const sdk = useMedusa()

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return withCache(
    event,
    "collections",
    `/store/collections?${JSON.stringify(queryParams)}`,
    () =>
      sdk.client.fetch<{
        collections: HttpTypes.StoreCollection[]
        count: number
      }>("/store/collections", {
        query: queryParams,
      })
  ).then(({ collections }) => ({ collections, count: collections.length }))
}

export async function getCollectionByHandle(
  event: H3Event,
  handle: string
): Promise<HttpTypes.StoreCollection | null> {
  const sdk = useMedusa()

  return withCache(
    event,
    "collections",
    `/store/collections?handle=${handle}`,
    () =>
      sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
        `/store/collections`,
        {
          query: { handle, fields: "*products" },
        }
      )
  ).then(({ collections }) => collections[0] || null)
}
