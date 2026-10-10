import { createError, defineEventHandler, readBody } from "h3"
import { updateRegion } from "../utils/data/cart"

/**
 * updateRegion — switches the active region: updates the cart's region (when
 * a cart exists), busts region/product caches and returns
 * { redirect: `/${country_code}${current_path}` }.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    country_code: string
    current_path: string
  }>(event)

  if (!body?.country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }

  return updateRegion(event, body.country_code, body.current_path ?? "")
})
