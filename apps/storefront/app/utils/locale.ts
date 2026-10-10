/**
 * The UI language is derived from the region country code already in the URL
 * (/{countryCode}/…), as in MapAndSky's storefront. ShaderPaper ships English
 * only for now, so every country maps to "en"; adding a language is a locale
 * file in i18n/locales plus an entry here.
 */
export type AppLocale = 'en'

const COUNTRY_LOCALES: Record<string, AppLocale> = {}

export function localeForCountry(countryCode?: string | null): AppLocale {
  if (!countryCode) return 'en'
  return COUNTRY_LOCALES[countryCode.toLowerCase()] ?? 'en'
}

/** BCP-47 tag for <html lang> and hreflang. */
const LANGUAGE_TAGS: Record<string, string> = {
  gb: 'en-GB',
  us: 'en-US',
  ie: 'en-IE',
  au: 'en-AU',
  ca: 'en-CA',
  nz: 'en-NZ',
}

export function languageTagFor(countryCode?: string | null): string {
  const cc = (countryCode || '').toLowerCase()
  return LANGUAGE_TAGS[cc] ?? 'en'
}

/** Intl locale used to format money and dates (English, the country's conventions where known). */
export function intlLocaleFor(countryCode?: string | null): string {
  const cc = (countryCode || '').toLowerCase()
  return LANGUAGE_TAGS[cc] ?? (cc ? `en-${cc.toUpperCase()}` : 'en-GB')
}
