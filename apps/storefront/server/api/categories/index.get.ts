import { defineEventHandler, getQuery } from "h3"
import { listCategories } from "../../utils/data/categories"

/** listCategories — query params pass through (limit, offset, fields, ...). */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return listCategories(event, query as Record<string, unknown>)
})
