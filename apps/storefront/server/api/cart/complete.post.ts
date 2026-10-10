import { defineEventHandler, readBody } from "h3"
import { placeOrder } from "../../utils/data/cart"

/**
 * placeOrder — completes the cart. On success clears the cart cookie and
 * returns { type: "order", order, redirect }; otherwise returns
 * { type: "cart", cart, error } (e.g. payment required).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ cart_id?: string } | undefined>(event).catch(
    () => undefined
  )

  return placeOrder(event, body?.cart_id)
})
