import { defineEventHandler, getRequestURL, sendRedirect } from "h3"

/**
 * Canonicalize trailing slashes, reproducing Next's default
 * `skipTrailingSlashRedirect: false` behaviour.
 *
 * Without this, /fr/ and /fr serve identical content at 200, so every canonical
 * URL has a duplicate twin — and the in-app 404's own "Go to frontpage" link
 * points at /fr/ (LocalizedLink appends the country code with a trailing slash),
 * making the duplicate directly reachable. Next 308s these to the bare form.
 *
 * 308 (not 301/302) preserves the request method, matching Next.
 * Runs before the region middleware so redirect chains stay one hop.
 */
const SKIP_PREFIXES = ["/_nuxt", "/api", "/__nuxt", "/_ipx", "/_scripts"]

export default defineEventHandler((event) => {
  const method = event.method
  if (method !== "GET" && method !== "HEAD") return

  const url = getRequestURL(event)
  const { pathname, search } = url

  if (pathname.length <= 1 || !pathname.endsWith("/")) return
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return
  // Files (anything with an extension) are served as-is.
  if (pathname.split("/").pop()?.includes(".")) return

  const canonical = pathname.replace(/\/+$/, "") + search
  return sendRedirect(event, canonical || "/", 308)
})
