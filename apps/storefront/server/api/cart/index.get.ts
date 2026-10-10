import { defineEventHandler, getQuery } from "h3"
import { retrieveCart } from "../../utils/data/cart"

/** retrieveCart — returns the cart (cookie or ?cart_id=) or null. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return retrieveCart(
    event,
    query.cart_id as string | undefined,
    query.fields as string | undefined
  )
})
