import { defineEventHandler, getQuery } from "h3"
import { listCollections } from "../../utils/data/collections"

/**
 * listCollections — returns { collections, count }.
 * NOTE (Next parity): count is the fetched page length, not the API total.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return listCollections(event, query as Record<string, string>)
})
