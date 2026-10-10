import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/payment.ts */

export async function listCartPaymentMethods(
  event: H3Event,
  regionId: string
): Promise<HttpTypes.StorePaymentProvider[] | null> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(
    event,
    "payment_providers",
    `/store/payment-providers?region_id=${regionId}`,
    () =>
      sdk.client.fetch<HttpTypes.StorePaymentProviderListResponse>(
        `/store/payment-providers`,
        {
          method: "GET",
          query: { region_id: regionId },
          headers,
        }
      )
  )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => null)
}
