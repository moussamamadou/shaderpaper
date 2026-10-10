import { defineEventHandler, getRouterParam, readBody } from "h3"
import type { AddressInput } from "../../../utils/data/customer"
import { updateCustomerAddress } from "../../../utils/data/customer"

/**
 * updateCustomerAddress — updates a customer address.
 * Returns { success, error } (never throws — form-action parity).
 */
export default defineEventHandler(async (event) => {
  const addressId = getRouterParam(event, "addressId")
  const body = await readBody<
    Omit<AddressInput, "is_default_billing" | "is_default_shipping">
  >(event)

  return updateCustomerAddress(event, addressId, body)
})
