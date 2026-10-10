import { defineEventHandler } from "h3"
import { listCartOptions } from "../../utils/data/cart"

/**
 * listCartOptions — shipping options for the cookie cart.
 * Returns { shipping_options: [...] }. Errors propagate (Next parity).
 */
export default defineEventHandler(async (event) => {
  return listCartOptions(event)
})
