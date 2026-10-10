import { createError, defineEventHandler, getQuery } from "h3"
import { listCartPaymentMethods } from "../utils/data/payment"

/**
 * listCartPaymentMethods — payment providers for ?region_id=, sorted
 * ascending by id, or null on error.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const regionId = query.region_id as string | undefined

  if (!regionId) {
    throw createError({ statusCode: 400, message: "region_id is required" })
  }

  return listCartPaymentMethods(event, regionId)
})
