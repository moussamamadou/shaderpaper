import { createError, defineEventHandler, getQuery } from "h3"
import { listCatalog } from "../utils/data/catalog"
import { medusaError } from "../utils/medusa-error"

/**
 * GET /api/catalog?country_code=fr → PosterCard[] (every poster of the
 * region, compact; see shared/utils/catalog.ts). [] for an unknown region.
 */
export default defineEventHandler(async (event) => {
  const { country_code } = getQuery(event)
  if (typeof country_code !== "string" || !country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }
  return listCatalog(event, country_code.toLowerCase()).catch(medusaError)
})
