import type { H3Event } from "h3"
import { getCookie, setCookie } from "h3"

/**
 * Cookie helpers (port of storefront-nextjs src/lib/data/cookies.ts +
 * locale-actions cookie handling), copied from MapAndSky's Nuxt storefront.
 *
 * Cookie names and flags MUST stay byte-identical to the Next.js storefront:
 * - _medusa_jwt               httpOnly, sameSite=strict, secure(prod), 7d
 * - _medusa_cart_id           httpOnly, sameSite=strict, secure(prod), 7d
 * - _medusa_cache_id          NOT httpOnly, default attrs, 1d (set by middleware)
 * - _medusa_locale            NOT httpOnly (client-readable), strict, secure(prod), 1y
 * - _medusa_pending_customer  httpOnly, strict, secure(prod), 1d, JSON payload
 *
 * Deletion pattern everywhere (as in Next): set "" with maxAge: -1.
 */

export const AUTH_TOKEN_COOKIE = "_medusa_jwt"
export const CART_ID_COOKIE = "_medusa_cart_id"
export const CACHE_ID_COOKIE = "_medusa_cache_id"
export const LOCALE_COOKIE = "_medusa_locale"
export const PENDING_CUSTOMER_COOKIE = "_medusa_pending_customer"

const isProduction = process.env.NODE_ENV === "production"

/**
 * Next's cookies() store returns values set earlier in the SAME request
 * (set-then-get works: e.g. setAuthToken during login, then transferCart
 * reads the token). h3's getCookie only parses the incoming Cookie header,
 * so we mirror pending writes on event.context and read them back first.
 */
const OVERRIDES_KEY = "_medusaCookieOverrides"

function rememberCookie(
  event: H3Event,
  name: string,
  value: string | null
): void {
  const ctx = event.context as Record<string, any>
  ;(ctx[OVERRIDES_KEY] ??= {})[name] = value
}

function readCookie(event: H3Event, name: string): string | undefined {
  const overrides = (event.context as Record<string, any>)[OVERRIDES_KEY] as
    | Record<string, string | null>
    | undefined

  if (overrides && name in overrides) {
    return overrides[name] ?? undefined
  }

  return getCookie(event, name)
}

// --- auth token (_medusa_jwt) ---

export function getAuthToken(event: H3Event): string | undefined {
  return readCookie(event, AUTH_TOKEN_COOKIE)
}

export function setAuthToken(event: H3Event, token: string): void {
  setCookie(event, AUTH_TOKEN_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
  })
  rememberCookie(event, AUTH_TOKEN_COOKIE, token)
}

export function removeAuthToken(event: H3Event): void {
  setCookie(event, AUTH_TOKEN_COOKIE, "", { maxAge: -1 })
  rememberCookie(event, AUTH_TOKEN_COOKIE, null)
}

// --- cart id (_medusa_cart_id) ---

export function getCartId(event: H3Event): string | undefined {
  return readCookie(event, CART_ID_COOKIE)
}

export function setCartId(event: H3Event, cartId: string): void {
  setCookie(event, CART_ID_COOKIE, cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
  })
  rememberCookie(event, CART_ID_COOKIE, cartId)
}

export function removeCartId(event: H3Event): void {
  setCookie(event, CART_ID_COOKIE, "", { maxAge: -1 })
  rememberCookie(event, CART_ID_COOKIE, null)
}

// --- cache id (_medusa_cache_id) ---
// Set by the region middleware (routing area) with default attrs, 24h.

export function getCacheId(event: H3Event): string | undefined {
  return readCookie(event, CACHE_ID_COOKIE)
}

export function setCacheId(event: H3Event, cacheId: string): void {
  setCookie(event, CACHE_ID_COOKIE, cacheId, {
    maxAge: 60 * 60 * 24,
  })
  rememberCookie(event, CACHE_ID_COOKIE, cacheId)
}

// --- locale (_medusa_locale) ---

export function getLocale(event: H3Event): string | null {
  try {
    return readCookie(event, LOCALE_COOKIE) ?? null
  } catch {
    return null
  }
}

export function setLocaleCookie(event: H3Event, locale: string): void {
  setCookie(event, LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false, // client JS reads this one
    sameSite: "strict",
    secure: isProduction,
  })
  rememberCookie(event, LOCALE_COOKIE, locale)
}

// --- pending customer (_medusa_pending_customer) ---
// During the email-verification flow the customer record isn't created until
// the customer verifies and logs in. Signup fields are persisted here so they
// survive the inbox round-trip.

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export function setPendingCustomer(
  event: H3Event,
  customer: PendingCustomer
): void {
  const value = JSON.stringify(customer)
  setCookie(event, PENDING_CUSTOMER_COOKIE, value, {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
  })
  rememberCookie(event, PENDING_CUSTOMER_COOKIE, value)
}

export function getPendingCustomer(event: H3Event): PendingCustomer | null {
  const value = readCookie(event, PENDING_CUSTOMER_COOKIE)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export function removePendingCustomer(event: H3Event): void {
  setCookie(event, PENDING_CUSTOMER_COOKIE, "", { maxAge: -1 })
  rememberCookie(event, PENDING_CUSTOMER_COOKIE, null)
}
