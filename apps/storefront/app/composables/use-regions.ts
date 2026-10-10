import type { HttpTypes } from "@medusajs/types"

/**
 * Thin typed wrappers over /api/regions*. All reads are SSR-safe via
 * useRequestFetch (forwards cookies during SSR).
 */
export function useRegions() {
  const requestFetch = useRequestFetch()

  /** GET /api/regions — errors propagate. */
  const listRegions = () =>
    requestFetch<HttpTypes.StoreRegion[]>("/api/regions")

  /** GET /api/regions/:id */
  const retrieveRegion = (id: string) =>
    requestFetch<HttpTypes.StoreRegion>(`/api/regions/${id}`)

  /** GET /api/regions/country/:code — null when unknown country. */
  const getRegion = async (
    countryCode: string
  ): Promise<HttpTypes.StoreRegion | null> => {
    const region = await requestFetch<HttpTypes.StoreRegion | null>(
      `/api/regions/country/${countryCode.toLowerCase()}`
    )
    return region ?? null
  }

  /** SSR-cached list of all regions, shared app-wide under key 'regions'. */
  const useRegionsData = () =>
    useAsyncData("regions", () => listRegions(), { default: () => [] })

  return { listRegions, retrieveRegion, getRegion, useRegionsData }
}
