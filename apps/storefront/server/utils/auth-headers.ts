import type { H3Event } from "h3"
import { getAuthToken } from "./cookies"

/**
 * Port of getAuthHeaders() from storefront-nextjs src/lib/data/cookies.ts.
 * Returns `{ authorization: "Bearer <jwt>" }` when the _medusa_jwt cookie is
 * present, `{}` otherwise (or when reading throws).
 *
 * NOTE (from spec): in Next the return value is always truthy, so
 * `if (!authHeaders) return null` guards there are dead code. Callers that
 * need a real "is logged in" check should use `hasAuthToken(event)`.
 */

export type AuthHeaders = { authorization: string } | Record<string, never>

export function getAuthHeaders(event: H3Event): AuthHeaders {
  try {
    const token = getAuthToken(event)

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export function hasAuthToken(event: H3Event): boolean {
  try {
    return Boolean(getAuthToken(event))
  } catch {
    return false
  }
}
