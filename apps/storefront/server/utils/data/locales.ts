import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { getCacheTag, revalidateTag, withCache } from "../cache"
import { getCartId, getLocale, setLocaleCookie } from "../cookies"
import { useMedusa } from "../medusa"

/**
 * Port of storefront-nextjs src/lib/data/locales.ts + locale-actions.ts.
 * (getLocale / setLocaleCookie live in ../cookies.ts.)
 */

export type Locale = {
  code: string
  name: string
}

/**
 * Fetches available locales from the backend. Returns null on any error
 * (e.g. 404 when the locales feature isn't configured) — callers hide the
 * locale switcher on null.
 */
export async function listLocales(event: H3Event): Promise<Locale[] | null> {
  const sdk = useMedusa()

  return withCache(event, "locales", "/store/locales", () =>
    sdk.client.fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
    })
  )
    .then(({ locales }) => locales)
    .catch(() => null)
}

/**
 * Sets the locale cookie, updates the cart's locale (when a cart exists) and
 * busts the localized caches. Returns the locale code.
 */
export async function updateLocale(
  event: H3Event,
  localeCode: string
): Promise<string> {
  setLocaleCookie(event, localeCode)

  const cartId = getCartId(event)
  if (cartId) {
    const sdk = useMedusa()
    const headers = { ...getAuthHeaders(event) }

    await sdk.store.cart.update(cartId, { locale: localeCode }, {}, headers)

    const cartCacheTag = getCacheTag(event, "carts")
    if (cartCacheTag) {
      revalidateTag(cartCacheTag)
    }
  }

  const productsCacheTag = getCacheTag(event, "products")
  if (productsCacheTag) {
    revalidateTag(productsCacheTag)
  }

  const categoriesCacheTag = getCacheTag(event, "categories")
  if (categoriesCacheTag) {
    revalidateTag(categoriesCacheTag)
  }

  const collectionsCacheTag = getCacheTag(event, "collections")
  if (collectionsCacheTag) {
    revalidateTag(collectionsCacheTag)
  }

  return localeCode
}
