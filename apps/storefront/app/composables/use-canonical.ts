/**
 * <link rel="canonical"> for the current route (called from the layouts, so
 * every page has one). Only `page` survives in the canonical query: filters,
 * sorts and customiser settings describe the same document. One language for
 * now, so no hreflang set (MapAndSky's use-alternate-links built one per market).
 */
const CANONICAL_QUERY_KEYS = ['page'] as const

export function useCanonical() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const href = computed(() => {
    const base = String(config.public.baseUrl || '').replace(/\/+$/, '')
    const path = route.path.replace(/\/+$/, '') || '/'
    const params = new URLSearchParams()
    for (const key of CANONICAL_QUERY_KEYS) {
      const raw = route.query[key]
      const value = Array.isArray(raw) ? raw[0] : raw
      if (value != null && value !== '' && value !== '1') params.set(key, String(value))
    }
    const q = params.toString()
    return `${base}${path}${q ? `?${q}` : ''}`
  })
  useHead({ link: [{ rel: 'canonical', href }] })
}
