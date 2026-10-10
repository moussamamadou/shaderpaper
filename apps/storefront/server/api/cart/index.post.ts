import { createError, defineEventHandler, readBody } from "h3"
import { getOrSetCart } from "../../utils/data/cart"

/** getOrSetCart — creates (or region-syncs) the cart for a country code. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ country_code?: string }>(event)

  if (!body?.country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }

  return getOrSetCart(event, body.country_code)
})
