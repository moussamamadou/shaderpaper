import { createError, defineEventHandler, readBody } from "h3"
import { setShippingMethod } from "../../utils/data/cart"

/** setShippingMethod — adds a shipping method to a cart. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    cart_id: string
    shipping_method_id: string
  }>(event)

  if (!body?.cart_id || !body?.shipping_method_id) {
    throw createError({
      statusCode: 400,
      message: "cart_id and shipping_method_id are required",
    })
  }

  await setShippingMethod(event, {
    cartId: body.cart_id,
    shippingMethodId: body.shipping_method_id,
  })

  return { success: true }
})
