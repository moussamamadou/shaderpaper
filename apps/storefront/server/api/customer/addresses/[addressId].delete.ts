import { defineEventHandler, getRouterParam } from "h3"
import { deleteCustomerAddress } from "../../../utils/data/customer"

/**
 * deleteCustomerAddress — deletes a customer address. Errors are swallowed
 * (Next parity: the original resolves void either way).
 */
export default defineEventHandler(async (event) => {
  const addressId = getRouterParam(event, "addressId")

  await deleteCustomerAddress(event, addressId as string)

  return { success: true }
})
