import { createError, defineEventHandler, readBody } from "h3"
import { updateLocale } from "../utils/data/locales"

/**
 * updateLocale — sets the _medusa_locale cookie, updates the cart's locale
 * (when one exists) and busts localized caches. Returns { locale }.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ locale: string }>(event)

  if (!body?.locale) {
    throw createError({ statusCode: 400, message: "locale is required" })
  }

  const locale = await updateLocale(event, body.locale)

  return { locale }
})
