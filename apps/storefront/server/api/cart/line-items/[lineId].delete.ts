import { defineEventHandler, getRouterParam } from "h3"
import { deleteLineItem } from "../../../utils/data/cart"

/** deleteLineItem — removes a line item from the cookie cart. */
export default defineEventHandler(async (event) => {
  const lineId = getRouterParam(event, "lineId")

  await deleteLineItem(event, lineId as string)

  return { success: true }
})
