import type { HttpTypes } from "@medusajs/types"
import { defineEventHandler, readBody } from "h3"
import { updateCart } from "../../utils/data/cart"

/** updateCart — updates the cookie cart with a StoreUpdateCart payload. */
export default defineEventHandler(async (event) => {
  const body = await readBody<HttpTypes.StoreUpdateCart>(event)

  return updateCart(event, body)
})
