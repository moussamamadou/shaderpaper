/**
 * Resolving a visitor's country from an HTTP request.
 *
 * The app server only sees an IP, so the country must come from an upstream
 * proxy/CDN that already did the lookup. Every provider picked a different
 * header name, so we read all the common ones rather than betting on one host.
 *
 * If you deploy behind something not listed here, add its header to GEO_HEADERS
 * — that is the only change needed.
 */

/** Ordered by specificity; first non-empty match wins. */
export const GEO_HEADERS = [
  "cf-ipcountry", // Cloudflare
  "x-vercel-ip-country", // Vercel
  "cloudfront-viewer-country", // AWS CloudFront
  "fastly-geo-country", // Fastly
  "x-client-geo-location", // Google Cloud load balancer ("US,California")
  "x-geo-country", // common nginx/Traefik GeoIP2 convention
  "x-country-code", // common custom convention
  "x-appengine-country", // Google App Engine
] as const

/** Values some providers send meaning "unknown" — must not be treated as a country. */
const NON_COUNTRIES = new Set(["xx", "t1", "zz", "", "unknown"])

/**
 * Extract a lowercase ISO-3166-1 alpha-2 code from a header bag.
 * Handles Google's "US,California" composite and Netlify's base64 JSON blob.
 */
export function countryFromHeaders(
  headers: Record<string, string | undefined>
): string | undefined {
  for (const name of GEO_HEADERS) {
    const raw = headers[name]
    if (!raw) continue
    // Google sends "US,California"; take the country part only.
    const code = raw.split(",")[0]?.trim().toLowerCase()
    if (code && code.length === 2 && !NON_COUNTRIES.has(code)) return code
  }

  // Netlify: x-nf-geo is base64-encoded JSON { country: { code: "AU" }, ... }
  const nf = headers["x-nf-geo"]
  if (nf) {
    try {
      const decoded = JSON.parse(
        typeof atob === "function"
          ? atob(nf)
          : Buffer.from(nf, "base64").toString("utf8")
      ) as { country?: { code?: string } }
      const code = decoded?.country?.code?.toLowerCase()
      if (code && code.length === 2 && !NON_COUNTRIES.has(code)) return code
    } catch {
      // Malformed header is not worth failing navigation over.
    }
  }

  return undefined
}
