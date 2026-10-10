import { defineEventHandler, readBody } from "h3"
import type { AddressInput } from "../../../utils/data/customer"
import { addCustomerAddress } from "../../../utils/data/customer"

/**
 * addCustomerAddress — creates a customer address.
 * Returns { success, error } (never throws — form-action parity).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<AddressInput>(event)

  return addCustomerAddress(event, body)
})
