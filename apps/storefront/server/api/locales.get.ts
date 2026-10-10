import { defineEventHandler } from "h3"
import { listLocales } from "../utils/data/locales"

/**
 * listLocales — [{ code, name }] or null (e.g. locales feature not
 * configured); callers hide the locale switcher on null.
 */
export default defineEventHandler(async (event) => {
  return listLocales(event)
})
