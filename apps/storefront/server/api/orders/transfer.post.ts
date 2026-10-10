import { defineEventHandler, readBody } from "h3"
import { createTransferRequest } from "../../utils/data/orders"

/**
 * createTransferRequest — requests an order transfer to the logged-in
 * customer. Returns { success, error, order } (never throws).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ order_id?: string }>(event)

  return createTransferRequest(event, body?.order_id)
})
