import { defineEventHandler, getQuery } from "h3"
import { listOrders } from "../../utils/data/orders"

/**
 * listOrders — the customer's orders (newest first). Read that THROWS on
 * failure (Next parity), e.g. 401 for guests.
 * Query: limit (default 10), offset (default 0), extra keys pass through.
 */
export default defineEventHandler(async (event) => {
  const { limit, offset, ...filters } = getQuery(event)

  return listOrders(
    event,
    limit ? Number(limit) : 10,
    offset ? Number(offset) : 0,
    filters as Record<string, unknown>
  )
})
