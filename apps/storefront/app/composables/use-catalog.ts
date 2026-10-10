import type { HttpTypes } from '@medusajs/types'
import type { PosterCard } from '#shared/utils/catalog'

/** The country code of the current route (/{countryCode}/…). */
export function useCountryCode() {
  const route = useRoute()
  return computed(() => String(route.params.countryCode ?? '').toLowerCase())
}

/**
 * Catalogue reads over /api/catalog*. `useCatalogCards()` is the whole poster
 * list of the region (SSR-cached under one key per country, so every page that
 * lists posters shares one fetch).
 */
export function useCatalog() {
  const requestFetch = useRequestFetch()
  const countryCode = useCountryCode()

  const useCatalogCards = () =>
    useAsyncData(
      () => `catalog-${countryCode.value}`,
      () => requestFetch<PosterCard[]>('/api/catalog', { query: { country_code: countryCode.value } }),
      { default: () => [] as PosterCard[], watch: [countryCode] },
    )

  const getProduct = async (handle: string) =>
    (await requestFetch<HttpTypes.StoreProduct | null>(`/api/catalog/${encodeURIComponent(handle)}`, {
      query: { country_code: countryCode.value },
    })) ?? null

  const search = (q: string) =>
    requestFetch<PosterCard[]>('/api/catalog/search', { query: { q, country_code: countryCode.value } })

  return { useCatalogCards, getProduct, search }
}
