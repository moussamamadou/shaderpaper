import { createHash } from "node:crypto"
import type { H3Event } from "h3"
import { getAuthToken, getCacheId } from "./cookies"

/**
 * Per-visitor tagged cache (port of getCacheTag/getCacheOptions from
 * storefront-nextjs src/lib/data/cookies.ts + next/cache revalidateTag).
 *
 * Next.js used `cache: "force-cache"` with per-visitor tags
 * `${tag}-${_medusa_cache_id}` and busted them with revalidateTag(). Nitro has
 * no fetch-cache, so this module replicates the behavior with a small
 * in-memory store:
 *
 * - getCacheTag(event, tag)      -> `${tag}-${cacheId}` or "" (missing cookie)
 * - getCacheOptions(event, tag)  -> { tags: [fullTag] } or {}   (API parity)
 * - revalidateTag(fullTag)       -> drops every entry carrying that tag
 *                                   (no-op on "" — guarded, unlike Next)
 * - withCache(event, tag, key, fn) -> read-through cache used by GET reads;
 *                                   skips caching entirely when there is no
 *                                   _medusa_cache_id cookie.
 *
 * Next keyed its fetch cache on the request *including headers*, so the
 * `authorization: Bearer <jwt>` header made every customer's (and the guest's)
 * entry distinct. The _medusa_cache_id cookie alone does NOT carry identity —
 * it is not httpOnly, lives 24h and survives logout — so keying on it alone
 * would replay one customer's private reads (e.g. /store/orders) to any later
 * request presenting the same cache id, including one with no JWT at all.
 * withCache therefore folds a hash of the caller's auth token into the key.
 *
 * Deviation from Next: entries expire after DEFAULT_TTL (1h) instead of
 * living forever — the _medusa_cache_id cookie rotates daily anyway.
 */

type CacheEntry = {
  value: unknown
  expires: number
  tags: string[]
}

const store = new Map<string, CacheEntry>()

const MAX_ENTRIES = 1000
export const DEFAULT_TTL_SECONDS = 3600

export function getCacheTag(event: H3Event, tag: string): string {
  try {
    const cacheId = getCacheId(event)

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

export function getCacheOptions(
  event: H3Event,
  tag: string
): { tags: string[] } | Record<string, never> {
  const cacheTag = getCacheTag(event, tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [cacheTag] }
}

/** Drop every cached entry carrying the given (full, per-visitor) tag. */
export function revalidateTag(tag: string): void {
  if (!tag) {
    return
  }

  for (const [key, entry] of store) {
    if (entry.tags.includes(tag)) {
      store.delete(key)
    }
  }
}

/**
 * Identity component of the cache key: a short digest of the caller's JWT, or
 * "anon" when there is none. Hashed so raw tokens never sit in map keys.
 */
function getIdentityKey(event: H3Event): string {
  let token: string | undefined

  try {
    token = getAuthToken(event)
  } catch {
    token = undefined
  }

  if (!token) {
    return "anon"
  }

  return createHash("sha256").update(token).digest("hex").slice(0, 16)
}

/**
 * Next's fetch cache serialized entries and deserialized a fresh object on
 * every read, so a caller could never mutate what the next reader would see.
 * This store holds live objects, so it clones on write and on read to get the
 * same isolation — otherwise an in-place sort or an added property (see
 * sortProducts) silently corrupts the shared entry for the whole TTL.
 *
 * Falls back to the original reference if the value isn't structured-cloneable;
 * every cached payload here is plain JSON, so that path shouldn't be reached.
 */
function cloneValue<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    return value
  }
}

/**
 * Read-through cache keyed per visitor AND per caller identity. `key` should
 * uniquely identify the request within the tag (path + serialized query).
 * Errors thrown by `fn` propagate and are never cached (mirrors force-cache +
 * .catch ordering). Callers receive a private copy they may freely mutate.
 */
export async function withCache<T>(
  event: H3Event,
  tag: string,
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const cacheTag = getCacheTag(event, tag)

  // No cache id -> no caching (mirrors getCacheOptions() returning {}).
  if (!cacheTag) {
    return fn()
  }

  const fullKey = `${cacheTag}:${getIdentityKey(event)}:${key}`
  const hit = store.get(fullKey)

  if (hit && hit.expires > Date.now()) {
    return cloneValue(hit.value) as T
  }

  const value = await fn()

  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest !== undefined) {
      store.delete(oldest)
    }
  }

  store.set(fullKey, {
    value: cloneValue(value),
    expires: Date.now() + ttlSeconds * 1000,
    tags: [cacheTag],
  })

  return value
}
