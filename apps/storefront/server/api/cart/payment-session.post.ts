import type { HttpTypes } from "@medusajs/types"
import { createError, defineEventHandler, readBody } from "h3"
import { initiatePaymentSession } from "../../utils/data/cart"

/** initiatePaymentSession — initiates a payment session on the cart. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    cart: HttpTypes.StoreCart
    data: HttpTypes.StoreInitializePaymentSession
  }>(event)

  if (!body?.cart || !body?.data) {
    throw createError({
      statusCode: 400,
      message: "cart and data are required",
    })
  }

  return initiatePaymentSession(event, body.cart, body.data)
})
