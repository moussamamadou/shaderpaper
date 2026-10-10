import { defineEventHandler, readBody } from "h3"
import type { SignupInput } from "../../utils/data/customer"
import { signup } from "../../utils/data/customer"

/**
 * signup — registers + logs in. Returns CustomerAuthState:
 * { state: "success" } | { state: "verification_required", email } |
 * { state: "error", error } (never throws — form-action parity).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<SignupInput>(event)

  return signup(event, body)
})
