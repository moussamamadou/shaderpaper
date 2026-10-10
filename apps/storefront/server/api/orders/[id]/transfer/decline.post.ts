import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { declineTransferRequest } from "../../../../utils/data/orders"

/**
 * declineTransferRequest — POST (not GET like the Next page render).
 * Returns { success, error, order }.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody<{ token: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, message: "token is required" })
  }

  return declineTransferRequest(event, id as string, body.token)
})
