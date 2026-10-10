import { defineEventHandler, getRouterParam } from "h3"
import { retrieveRegion } from "../../utils/data/regions"

/** retrieveRegion — a region by ID. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")

  return retrieveRegion(event, id as string)
})
