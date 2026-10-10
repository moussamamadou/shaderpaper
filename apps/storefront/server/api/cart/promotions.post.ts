import { defineEventHandler, readBody } from "h3"
import { applyPromotions } from "../../utils/data/cart"

/**
 * applyPromotions — REPLACES the cart's promo code list wholesale.
 * Removing a code = resubmitting the list without it.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ codes: string[] }>(event)

  await applyPromotions(event, body?.codes ?? [])

  return { success: true }
})
