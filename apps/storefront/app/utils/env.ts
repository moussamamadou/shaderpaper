/**
 * Port of storefront-nextjs src/lib/util/env.ts.
 * Uses Nuxt runtime config (NUXT_PUBLIC_BASE_URL) instead of
 * NEXT_PUBLIC_BASE_URL. Must be called within a Nuxt context.
 */

export const getBaseURL = (): string => {
  const config = useRuntimeConfig()
  return config.public.baseUrl || "http://localhost:3000"
}
