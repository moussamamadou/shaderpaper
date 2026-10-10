import { defineEventHandler, getRouterParam } from "h3"
import { retrieveCollection } from "../../utils/data/collections"

/** retrieveCollection — a collection by ID. Errors propagate (Next parity). */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")

  return retrieveCollection(event, id as string)
})
