/**
 * Binds the active i18n locale to the region country code in the route.
 *
 * Markets: /fr -> French; /us, /gb, /au, /ca -> English. Because language is a
 * function of the region already in the URL, switching country via the country
 * select switches language with it.
 *
 * Everything here runs inside the plugin's setup context — `useHead` in
 * particular must NOT be called from a router hook (that throws NUXT_E1001),
 * so the <html lang> is bound once to a computed instead.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const { $i18n } = nuxtApp as unknown as {
    $i18n: {
      locale: { value: string }
      setLocale: (l: string) => Promise<void>
    }
  }

  // currentRoute is a ref, so this stays reactive across navigation — unlike
  // useRoute(), which is bound to the component instance that called it.
  const currentRoute = useRouter().currentRoute

  const countryCode = computed(
    () => currentRoute.value.params.countryCode as string | undefined
  )

  const applyLocale = async (cc?: string) => {
    const target = localeForCountry(cc)
    if ($i18n.locale.value !== target) {
      await $i18n.setLocale(target)
    }
  }

  // Bound once, in a valid context; the computed keeps it correct on navigation.
  // Registered BEFORE the await below: after an await the plugin's Nuxt context
  // is no longer guaranteed, and useHead outside a context throws NUXT_E1001.
  useHead({
    htmlAttrs: {
      lang: computed(() => languageTagFor(countryCode.value)),
    },
  })

  // Client-side region switches (the country select) re-apply the locale.
  // Deliberately NOT `immediate` — the first application is awaited below.
  watch(countryCode, (cc) => {
    void applyLocale(cc)
  })

  // AWAITED, and this is load-bearing: setLocale resolves the target locale's
  // message file, so firing it without awaiting let SSR render the page while
  // the locale was still `defaultLocale`. Every region shipped French HTML
  // (correct <html lang="en-US">, French body copy) and only flipped to English
  // after hydration. Nuxt awaits async plugins, so blocking here is what
  // guarantees the server renders in the region's own language.
  await applyLocale(countryCode.value)
})
