/**
 * "Billing same as shipping" detection (port of the Medusa starter's
 * compare-addresses, without lodash). address_2 and email are deliberately
 * excluded.
 */
const COMPARED_FIELDS = [
  'first_name',
  'last_name',
  'address_1',
  'company',
  'postal_code',
  'city',
  'country_code',
  'province',
  'phone',
] as const

export function compareAddresses(address1: object, address2: object): boolean {
  const a = address1 as Record<string, unknown>
  const b = address2 as Record<string, unknown>
  return COMPARED_FIELDS.every((field) => (a[field] ?? null) === (b[field] ?? null))
}
