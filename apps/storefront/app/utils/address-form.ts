import type { HttpTypes } from '@medusajs/types'

/** An address as the checkout and account forms edit it. */
export interface AddressForm {
  first_name: string
  last_name: string
  address_1: string
  company: string
  postal_code: string
  city: string
  province: string
  country_code: string
  phone: string
}
export type AddressErrors = Partial<Record<keyof AddressForm | 'email', string | null>>

export const ADDRESS_REQUIRED: (keyof AddressForm)[] = ['first_name', 'last_name', 'address_1', 'postal_code', 'city', 'country_code']

type AddressLike = Partial<Record<keyof AddressForm, string | null | undefined>> | null | undefined

export function addressForm(a?: AddressLike | HttpTypes.StoreCartAddress | HttpTypes.StoreCustomerAddress): AddressForm {
  const v = (a ?? {}) as Record<string, string | null | undefined>
  return {
    first_name: v.first_name ?? '',
    last_name: v.last_name ?? '',
    address_1: v.address_1 ?? '',
    company: v.company ?? '',
    postal_code: v.postal_code ?? '',
    city: v.city ?? '',
    province: v.province ?? '',
    country_code: v.country_code ?? '',
    phone: v.phone ?? '',
  }
}

/** Trimmed copy (what is sent to Medusa). */
export function cleanAddress(f: AddressForm): AddressForm {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v ?? '').trim()])) as unknown as AddressForm
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

/**
 * Field errors for an address (and an email when given). `t` turns keys into
 * messages; an empty object means the form is valid.
 */
export function validateAddress(
  f: AddressForm,
  t: (key: string) => string,
  opts: { email?: string; countries?: string[] } = {},
): AddressErrors {
  const e: AddressErrors = {}
  if (opts.email !== undefined) {
    if (!opts.email.trim()) e.email = t('validation.emailRequired')
    else if (!isEmail(opts.email)) e.email = t('validation.emailInvalid')
  }
  for (const k of ADDRESS_REQUIRED) {
    if (!String(f[k] ?? '').trim()) e[k] = t(`validation.${k}`)
  }
  if (f.country_code && opts.countries?.length && !opts.countries.includes(f.country_code)) {
    e.country_code = t('validation.countryNotShipped')
  }
  return e
}

/** The order fields are shown in, for the error summary and focus. */
export const ADDRESS_FIELD_ORDER: (keyof AddressForm | 'email')[] = [
  'email',
  'first_name',
  'last_name',
  'address_1',
  'postal_code',
  'city',
  'country_code',
]
