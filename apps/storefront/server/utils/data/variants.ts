import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/variants.ts */

/**
 * NOTE: no auth short-circuit here — the endpoint is public and guests must
 * still get the variant (the Next `!authHeaders` guard was dead code).
 */
export async function retrieveVariant(
  event: H3Event,
  variantId: string
): Promise<HttpTypes.StoreProductVariant | null> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(
    event,
    "variants",
    `/store/product-variants/${variantId}`,
    () =>
      sdk.client.fetch<{ variant: HttpTypes.StoreProductVariant }>(
        `/store/product-variants/${variantId}`,
        {
          method: "GET",
          query: { fields: "*images" },
          headers,
        }
      )
  )
    .then(({ variant }) => variant)
    .catch(() => null)
}
