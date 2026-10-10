import { defineEventHandler } from "h3"
import { getLocale } from "../utils/cookies"

/** getLocale — { locale: string | null } from the _medusa_locale cookie. */
export default defineEventHandler((event) => {
  return { locale: getLocale(event) }
})
