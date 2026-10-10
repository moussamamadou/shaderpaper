// ShaderPaper storefront. The server layer (server/api/**, server/utils/**), the
// composables, the region middleware and the i18n wiring are copied from
// MapAndSky's (Méridien's) Nuxt storefront; the UI is new, on the ShaderPaper
// tokens (docs/storefront/tokens.json → tailwind.config.ts).

export default defineNuxtConfig({
  compatibilityDate: '2026-07-20',
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxtjs/i18n'],

  // Language is derived from the country code already in the URL (/{cc}/…),
  // so i18n owns translation only (strategy no_prefix) and
  // app/plugins/i18n-locale.ts sets the locale from the route. English only
  // for now; a second locale is a new file plus a line in app/utils/locale.ts.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-GB', name: 'English', file: 'en.json' }],
    langDir: 'locales',
    detectBrowserLanguage: false,
  },

  // Geist and Geist Mono, self-hosted through @fontsource (as Méridien loads its fonts).
  css: ['@fontsource-variable/geist', '@fontsource-variable/geist-mono', '~~/assets/css/main.css'],

  tailwindcss: { configPath: 'tailwind.config.ts', cssPath: false, exposeConfig: false, viewer: false },

  // Every component is named after its folder: components/ui/Button.vue →
  // <UiButton>, components/layout/Header.vue → <LayoutHeader>.
  components: [{ path: '~/components', pathPrefix: true }],

  runtimeConfig: {
    // server-only
    medusaBackendUrl: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000',
    // Only the BFF talks to Medusa, so the publishable key stays out of the
    // client payload. (NUXT_PUBLIC_… is still read, for older .env files.)
    medusaPublishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '',
    public: {
      defaultRegion: process.env.NUXT_PUBLIC_DEFAULT_REGION || 'fr',
      // Where visitors we cannot place land (falls through to the default
      // region, then to the first region the backend lists).
      fallbackRegion: process.env.NUXT_PUBLIC_FALLBACK_REGION || '',
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      stripeKey: process.env.NUXT_PUBLIC_STRIPE_KEY || '',
      medusaPaymentsPublishableKey: process.env.NUXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY || '',
      medusaPaymentsAccountId: process.env.NUXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID || '',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'theme-color', content: '#F5F3EF' },
        { name: 'description', content: 'Posters of generative shader art, customised by you and printed to order.' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  typescript: { strict: true },

  nitro: {
    experimental: {
      // server/utils/medusa.ts resolves the current request (useEvent) to
      // inject the x-medusa-locale header on every backend call.
      asyncContext: true,
    },
  },

  routeRules: {
    // public/engine/index.html is copied from explorations/ before dev/build.
    '/engine/**': { headers: { 'cache-control': 'no-cache' } },
    // Print render page: never indexed.
    '/render': { headers: { 'x-robots-tag': 'noindex, nofollow' } },
  },
})
