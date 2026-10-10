import type { HttpTypes } from "@medusajs/types"
import { defineEventHandler, readBody } from "h3"
import { updateCustomer } from "../../utils/data/customer"

/** updateCustomer — updates the logged-in customer's profile. */
export default defineEventHandler(async (event) => {
  const body = await readBody<HttpTypes.StoreUpdateCustomer>(event)

  return updateCustomer(event, body)
})
