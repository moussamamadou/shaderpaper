/**
 * Marks <html data-hydrated> once the first page has fully hydrated (async
 * setup included), so end-to-end tests click only when listeners exist.
 * #__nuxt.__vue_app__ is set earlier, before Suspense resolves.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:suspense:resolve', () => {
    document.documentElement.dataset.hydrated = ''
  })
})
