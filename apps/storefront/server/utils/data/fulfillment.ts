import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/fulfillment.ts */

export async function listCartShippingMethods(
  event: H3Event,
  cartId: string
): Promise<HttpTypes.StoreCartShippingOption[] | null> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(
    event,
    "fulfillment",
    `/store/shipping-options?cart_id=${cartId}`,
    () =>
      sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
        `/store/shipping-options`,
        {
          method: "GET",
          query: { cart_id: cartId },
          headers,
        }
      )
  )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => null)
}

export async function calculatePriceForShippingOption(
  event: H3Event,
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>
): Promise<HttpTypes.StoreCartShippingOption | null> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  // The `data` key is present even when undefined (Next parity).
  const body = { cart_id: cartId, data }

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: "POST",
        body,
        headers,
      }
    )
    .then(({ shipping_option }) => shipping_option)
    .catch(() => null)
}
