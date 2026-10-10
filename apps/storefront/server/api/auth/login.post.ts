import { defineEventHandler, readBody } from "h3"
import { login } from "../../utils/data/customer"

/**
 * login — authenticates and sets the _medusa_jwt cookie. Returns
 * CustomerAuthState (never throws — form-action parity). Also transfers the
 * guest cart to the customer on success.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  return login(event, body)
})
