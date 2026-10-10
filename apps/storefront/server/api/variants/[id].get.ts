import { defineEventHandler, getRouterParam } from "h3"
import { retrieveVariant } from "../../utils/data/variants"

/** retrieveVariant — a variant (fields=*images) or null on error. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")

  return retrieveVariant(event, id as string)
})
