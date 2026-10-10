import { defineEventHandler, getRouterParam, readBody } from "h3"
import { calculatePriceForShippingOption } from "../../../utils/data/fulfillment"

/**
 * calculatePriceForShippingOption — calculated price for a shipping option.
 * Body: { cart_id, data? }. Returns the option or null on error.
 */
export default defineEventHandler(async (event) => {
  const optionId = getRouterParam(event, "optionId")
  const body = await readBody<{
    cart_id: string
    data?: Record<string, unknown>
  }>(event)

  return calculatePriceForShippingOption(
    event,
    optionId as string,
    body?.cart_id,
    body?.data
  )
})
