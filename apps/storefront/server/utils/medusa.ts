import Medusa, { type FetchArgs, type FetchInput } from "@medusajs/js-sdk"
import { getCookie } from "h3"
import { LOCALE_COOKIE } from "./cookies"

/**
 * Server-side Medusa SDK singleton (port of storefront-nextjs src/lib/config.ts).
 *
 * The SDK instance lives ONLY in Nitro — the browser talks to our /api/*
 * routes, never to the Medusa backend directly.
 *
 * Like the Next.js app, sdk.client.fetch is patched so that EVERY request to
 * the backend carries the `x-medusa-locale` header read from the
 * `_medusa_locale` cookie of the incoming request (unless the caller already
 * set it). Errors reading the cookie/event context are swallowed, mirroring
 * the Next implementation. Requires nitro.experimental.asyncContext so
 * useEvent() resolves the current request.
 */

let _sdk: Medusa | null = null

export function useMedusa(): Medusa {
  if (_sdk) {
    return _sdk
  }

  const config = useRuntimeConfig()

  _sdk = new Medusa({
    baseUrl: config.medusaBackendUrl || "http://localhost:9000",
    debug: process.env.NODE_ENV === "development",
    publishableKey: config.medusaPublishableKey,
    auth: {
      type: "jwt",
      // The instance is shared across requests: never persist tokens on the
      // client. Auth is passed explicitly per call via getAuthHeaders(event).
      jwtTokenStorageMethod: "nostore",
    },
  })

  const originalFetch = _sdk.client.fetch.bind(_sdk.client)

  _sdk.client.fetch = async <T>(
    input: FetchInput,
    init?: FetchArgs
  ): Promise<T> => {
    const headers: Record<string, any> = { ...((init?.headers as any) ?? {}) }

    try {
      const event = useEvent()
      const locale = getCookie(event, LOCALE_COOKIE) ?? null
      if (locale) {
        headers["x-medusa-locale"] ??= locale
      }
    } catch {
      // No request context (e.g. warmup) — skip locale injection.
    }

    return originalFetch(input, { ...init, headers })
  }

  return _sdk
}
