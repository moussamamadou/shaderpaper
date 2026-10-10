import { defineEventHandler, getRouterParam, readBody } from "h3"
import { updateLineItem } from "../../../utils/data/cart"

/** updateLineItem — updates a line item's quantity. */
export default defineEventHandler(async (event) => {
  const lineId = getRouterParam(event, "lineId")
  const body = await readBody<{ quantity: number }>(event)

  await updateLineItem(event, {
    lineId: lineId as string,
    quantity: body?.quantity,
  })

  return { success: true }
})
