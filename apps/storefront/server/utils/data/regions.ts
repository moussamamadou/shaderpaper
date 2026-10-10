import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/regions.ts */

export async function listRegions(
  event: H3Event
): Promise<HttpTypes.StoreRegion[]> {
  const sdk = useMedusa()

  return withCache(event, "regions", "/store/regions", () =>
    sdk.client
      .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
        method: "GET",
      })
      .then(({ regions }) => regions)
  )
}

export async function retrieveRegion(
  event: H3Event,
  id: string
): Promise<HttpTypes.StoreRegion> {
  const sdk = useMedusa()

  return withCache(event, ["regions", id].join("-"), `/store/regions/${id}`, () =>
    sdk.client
      .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
        method: "GET",
      })
      .then(({ region }) => region)
  )
}

// Module-level memo, mirrors Next: lives for the server process lifetime.
// New regions/countries added in the backend need a server restart.
const regionMap = new Map<string, HttpTypes.StoreRegion>()

export async function getRegion(
  event: H3Event,
  countryCode: string
): Promise<HttpTypes.StoreRegion | undefined | null> {
  if (regionMap.has(countryCode)) {
    return regionMap.get(countryCode)
  }

  const regions = await listRegions(event)

  if (!regions) {
    return null
  }

  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      regionMap.set(c?.iso_2 ?? "", region)
    })
  })

  // Falls back to "us" only when countryCode is falsy; unknown codes return
  // undefined (same as Next).
  const region = countryCode ? regionMap.get(countryCode) : regionMap.get("us")

  return region
}
