import { createError, defineEventHandler, getQuery } from "h3"
import { searchCatalog } from "../../utils/data/catalog"
import { medusaError } from "../../utils/medusa-error"

/**
 * GET /api/catalog/search?q=…&country_code=fr → PosterCard[] from Medusa's
 * store product search (`q`). An empty query returns [].
 */
export default defineEventHandler(async (event) => {
  const { q, country_code } = getQuery(event)
  if (typeof country_code !== "string" || !country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }
  return searchCatalog(event, typeof q === "string" ? q : "", country_code.toLowerCase()).catch(medusaError)
})
