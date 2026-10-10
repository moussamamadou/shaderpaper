import { createError, defineEventHandler, getQuery } from "h3"
import { listCartShippingMethods } from "../../utils/data/fulfillment"

/** listCartShippingMethods — shipping options for ?cart_id=, or null on error. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cartId = query.cart_id as string | undefined

  if (!cartId) {
    throw createError({ statusCode: 400, message: "cart_id is required" })
  }

  return listCartShippingMethods(event, cartId)
})
