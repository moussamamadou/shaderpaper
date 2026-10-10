import { defineEventHandler } from "h3"
import { transferCart } from "../../utils/data/customer"

/** transferCart — claims the guest cookie cart for the logged-in customer. */
export default defineEventHandler(async (event) => {
  await transferCart(event)

  return { success: true }
})
