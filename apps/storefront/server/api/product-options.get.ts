import { defineEventHandler } from "h3"
import type { HttpTypes } from "@medusajs/types"
import { useMedusa } from "../utils/medusa"

/**
 * listProductOptions — backs the store sidebar OptionsPicker.
 *
 * Port of the client-side `sdk.client.fetch("/store/product-options", { query:
 * { is_exclusive: false, fields: "*values" } })` call in
 * storefront-nextjs/src/modules/store/components/refinement-list/options-picker.
 * Moved server-side so the SDK (and the publishable key / locale header) never
 * reaches the browser.
 *
 * NOTE: `/store/product-options` is NOT a stock Medusa v2 store route — the
 * backend must expose it. When it is absent this route propagates the backend
 * error and the picker hides itself (Next parity).
 */
export default defineEventHandler(async () => {
  const sdk = useMedusa()

  return sdk.client.fetch<{
    product_options?: HttpTypes.StoreProductOption[]
  }>("/store/product-options", {
    method: "GET",
    query: {
      is_exclusive: false,
      fields: "*values",
    },
  })
})
