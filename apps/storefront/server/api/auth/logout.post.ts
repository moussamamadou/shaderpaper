import { defineEventHandler, readBody } from "h3"
import { signout } from "../../utils/data/customer"

/**
 * signout — logs out: clears _medusa_jwt AND _medusa_cart_id cookies, busts
 * customer/cart caches, returns { redirect: `/${country_code}/account` }.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ country_code?: string } | undefined>(
    event
  ).catch(() => undefined)

  return signout(event, body?.country_code ?? "")
})
