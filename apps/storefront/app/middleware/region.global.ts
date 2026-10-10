import type { HttpTypes } from "@medusajs/types"

/**
 * Copied from MapAndSky's storefront (its port of the Medusa Next starter's
 * middleware.ts); ShaderPaper skips /render and /engine.
 *
 * Resolves the country code for every navigation and 307-redirects to
 * /{countryCode}/... when the URL is missing (or has a wrong) prefix,
 * preserving the query string. Manages the _medusa_cache_id cookie
 * (set only on pass-through, Next parity).
 *
 * The region map comes from OUR Nitro route /api/regions (the SDK stays
 * server-side) and is cached module-level with a 1h TTL — mirroring the Next
 * middleware's in-memory regionMapCache.
 */

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: 0,
}

type RegionsFetcher = (url: "/api/regions") => Promise<HttpTypes.StoreRegion[]>

async function getRegionMap(
  fetcher: RegionsFetcher
): Promise<Map<string, HttpTypes.StoreRegion>> {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    const regions = await fetcher("/api/regions")

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2?.toLowerCase() ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

export default defineNuxtRouteMiddleware(async (to) => {
  const path = to.path

  // Next matcher parity: skip api routes, assets and any file-like path.
  if (
    path.startsWith("/api") ||
    path.startsWith("/_") ||
    path.startsWith("/__") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/images") ||
    path.startsWith("/assets") ||
    // ShaderPaper: the print render page and the shader engine sit outside
    // the country routes.
    path === "/render" ||
    path.startsWith("/engine") ||
    path.includes(".")
  ) {
    return
  }

  const config = useRuntimeConfig()
  const DEFAULT_REGION = (config.public.defaultRegion as string) || "fr"
  // Where visitors we cannot place (or cannot detect) land, when set
  // (NUXT_PUBLIC_FALLBACK_REGION); otherwise the default region.
  const FALLBACK_REGION =
    (config.public.fallbackRegion as string) || DEFAULT_REGION

  let regionMap: Map<string, HttpTypes.StoreRegion>
  try {
    // useRequestFetch forwards the incoming cookies during SSR; on the client
    // it is plain $fetch.
    const requestFetch = useRequestFetch()
    regionMap = await getRegionMap((url) => requestFetch<HttpTypes.StoreRegion[]>(url))
  } catch (e) {
    // Backend down: never brick navigation over region resolution.
    console.error("region middleware: failed to fetch regions", e)
    return
  }

  const firstSegment = path.split("/")[1]?.toLowerCase()

  // Country resolution priority (Next parity): URL segment -> geo header ->
  // default region -> first key of the region map.
  let countryCode: string | undefined

  // Host-agnostic: reads every common CDN geo header (see app/utils/geo.ts),
  // so detection survives a change of hosting provider.
  const geoHeaders = import.meta.server
    ? useRequestHeaders([...GEO_HEADERS, "x-nf-geo"])
    : {}
  const detectedCountry = countryFromHeaders(geoHeaders)

  if (firstSegment && regionMap.has(firstSegment)) {
    countryCode = firstSegment
  } else if (detectedCountry && regionMap.has(detectedCountry)) {
    countryCode = detectedCountry
  } else if (regionMap.has(FALLBACK_REGION)) {
    countryCode = FALLBACK_REGION
  } else if (regionMap.has(DEFAULT_REGION)) {
    countryCode = DEFAULT_REGION
  } else if (regionMap.keys().next().value) {
    countryCode = regionMap.keys().next().value
  }

  const country = countryCode || DEFAULT_REGION
  const urlHasCountry = firstSegment === country.toLowerCase()

  if (urlHasCountry) {
    // Set _medusa_cache_id only when missing (pass-through only, Next parity).
    const cacheId = useCookie<string | undefined>("_medusa_cache_id", {
      maxAge: 60 * 60 * 24,
      path: "/",
    })
    if (!cacheId.value) {
      cacheId.value =
        globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2)
    }
    return
  }

  // 307 redirect to the country-prefixed URL, query string preserved.
  // ShaderPaper: a country we do not ship to (/us/posters/glass) is swapped
  // for the resolved one rather than nested under it (/fr/us/posters/glass).
  // No page sits at a two-letter top-level path, so the test is safe.
  const unservedCountry = !!firstSegment && /^[a-z]{2}$/.test(firstSegment)
  const rest = unservedCountry ? path.slice(firstSegment.length + 1) : path
  const redirectPath = rest === "/" ? "" : rest
  return navigateTo(
    { path: `/${country}${redirectPath}`, query: to.query },
    { redirectCode: 307 }
  )
})
