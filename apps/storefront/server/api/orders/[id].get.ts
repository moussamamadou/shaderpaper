import { defineEventHandler, getRouterParam } from "h3"
import { retrieveOrder } from "../../utils/data/orders"

/** retrieveOrder — an order by ID. Read that THROWS on failure (Next parity). */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")

  return retrieveOrder(event, id as string)
})
