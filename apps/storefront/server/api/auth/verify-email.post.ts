import { createError, defineEventHandler, readBody } from "h3"
import { confirmEmailVerification } from "../../utils/data/customer"

/**
 * confirmEmailVerification — confirms the email using the token from the
 * verification link. Unauthenticated (works cross-device).
 * Returns { success: boolean, error?: string }.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, message: "token is required" })
  }

  return confirmEmailVerification(body.token)
})
