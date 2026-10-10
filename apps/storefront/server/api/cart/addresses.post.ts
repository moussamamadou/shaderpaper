import { defineEventHandler, readBody } from "h3"
import type { SetAddressesInput } from "../../utils/data/cart"
import { setAddresses } from "../../utils/data/cart"

/**
 * setAddresses — sets shipping/billing addresses + email on the cookie cart.
 * Returns { success: true, redirect } or { success: false, error } (never
 * throws — form-action parity).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<SetAddressesInput>(event)

  return setAddresses(event, body)
})
