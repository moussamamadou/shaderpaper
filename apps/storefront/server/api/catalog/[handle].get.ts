import { createError, defineEventHandler, getQuery, getRouterParam } from "h3"
import { getPosterProduct } from "../../utils/data/catalog"
import { medusaError } from "../../utils/medusa-error"

/**
 * GET /api/catalog/:handle?country_code=fr → the poster product with priced
 * variants, options, collection and metadata (shader, knobs), or 204 when
 * there is none.
 */
export default defineEventHandler(async (event) => {
  const handle = getRouterParam(event, "handle")
  const { country_code } = getQuery(event)
  if (!handle || !/^[a-z0-9_-]{1,60}$/i.test(handle)) {
    throw createError({ statusCode: 400, message: "Invalid product handle" })
  }
  if (typeof country_code !== "string" || !country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }
  return getPosterProduct(event, handle, country_code.toLowerCase()).catch(medusaError)
})
