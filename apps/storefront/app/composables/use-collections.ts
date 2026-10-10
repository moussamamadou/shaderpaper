import type { HttpTypes } from "@medusajs/types"

export function useCollections() {
  const requestFetch = useRequestFetch()

  /**
   * GET /api/collections — { collections, count } (count = page length,
   * Next parity). queryParams passthrough (limit default "100", fields, ...).
   */
  const listCollections = (
    queryParams: Record<string, string> = {}
  ): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> =>
    requestFetch<{ collections: HttpTypes.StoreCollection[]; count: number }>("/api/collections", { query: queryParams })

  /** GET /api/collections/handle/:handle — null when missing. */
  const getCollectionByHandle = async (
    handle: string
  ): Promise<HttpTypes.StoreCollection | null> => {
    const res = await requestFetch<HttpTypes.StoreCollection | null>(
      `/api/collections/handle/${handle}`
    )
    return res ?? null
  }

  /** GET /api/collections/:id — errors propagate. */
  const retrieveCollection = (id: string) =>
    requestFetch<HttpTypes.StoreCollection>(`/api/collections/${id}`)

  return { listCollections, getCollectionByHandle, retrieveCollection }
}
