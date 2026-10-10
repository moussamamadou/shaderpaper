import { createError, defineEventHandler, getRouterParam, readBody } from "h3"
import { acceptTransferRequest } from "../../../../utils/data/orders"

/**
 * acceptTransferRequest — POST (not GET like the Next page render — avoids
 * prefetch-triggered mutations). Returns { success, error, order }.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody<{ token: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, message: "token is required" })
  }

  return acceptTransferRequest(event, id as string, body.token)
})
