/**
 * Locale composable over /api/locale(s). Port of lib/data/locales.ts +
 * locale-actions.ts (client side).
 */
export type StoreLocale = { code: string; name: string }

export function useLocales() {
  const requestFetch = useRequestFetch()

  /** GET /api/locales — null when the feature isn't configured (hide switcher). */
  const listLocales = async (): Promise<StoreLocale[] | null> => {
    const res = await requestFetch<StoreLocale[] | null>("/api/locales").catch(
      () => null
    )
    return res ?? null
  }

  /** GET /api/locale — current locale cookie value. */
  const getLocale = async (): Promise<string | null> => {
    const res = await requestFetch<{ locale: string | null }>("/api/locale")
    return res.locale
  }

  /** POST /api/locale — sets cookie, syncs cart locale, busts caches. */
  const updateLocale = async (locale: string): Promise<string> => {
    const res = await requestFetch<{ locale: string }>("/api/locale", {
      method: "POST",
      body: { locale },
    })
    return res.locale
  }

  return { listLocales, getLocale, updateLocale }
}
