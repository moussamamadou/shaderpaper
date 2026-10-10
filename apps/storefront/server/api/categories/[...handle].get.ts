import { defineEventHandler, getRouterParam } from "h3"
import { getCategoryByHandle } from "../../utils/data/categories"

/**
 * getCategoryByHandle — catch-all: /api/categories/a/b maps to the category
 * with handle "a/b". Returns the category or null when not found.
 */
export default defineEventHandler(async (event) => {
  const handle = getRouterParam(event, "handle") ?? ""
  const segments = handle.split("/").filter(Boolean)

  const category = await getCategoryByHandle(event, segments)

  return category ?? null
})
