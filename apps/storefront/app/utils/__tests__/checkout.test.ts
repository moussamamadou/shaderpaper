import { describe, expect, it } from 'vitest'
import { isManual, isStripeLike, isTestMode, paymentTitleKey } from '../checkout'
import { addressForm, cleanAddress, validateAddress } from '../address-form'

describe('payment providers', () => {
  it('is in test mode only when every provider is the manual one', () => {
    expect(isTestMode([{ id: 'pp_system_default' }])).toBe(true)
    expect(isTestMode([{ id: 'pp_system_default' }, { id: 'pp_stripe_stripe' }])).toBe(false)
    expect(isTestMode([])).toBe(false)
    expect(isTestMode(null)).toBe(false)
  })

  it('tells the providers apart', () => {
    expect(isManual('pp_system_default')).toBe(true)
    expect(isStripeLike('pp_stripe_stripe')).toBe(true)
    expect(isStripeLike('pp_medusa-payments_default')).toBe(true)
    expect(isStripeLike('pp_system_default')).toBe(false)
    expect(paymentTitleKey('pp_system_default')).toBe('checkout.payManual')
    expect(paymentTitleKey('pp_stripe_stripe')).toBe('checkout.payCard')
  })
})

describe('address form', () => {
  const t = (k: string) => k

  it('reports every missing required field on an empty submit', () => {
    const errors = validateAddress(addressForm(), t, { email: '' })
    expect(Object.keys(errors).sort()).toEqual(['address_1', 'city', 'country_code', 'email', 'first_name', 'last_name', 'postal_code'])
    expect(errors.email).toBe('validation.emailRequired')
  })

  it('checks the email format and the shipping countries', () => {
    const f = addressForm({ first_name: 'A', last_name: 'B', address_1: '1 rue X', postal_code: '75001', city: 'Paris', country_code: 'us' })
    expect(validateAddress(f, t, { email: 'nope', countries: ['fr', 'de'] })).toEqual({
      email: 'validation.emailInvalid',
      country_code: 'validation.countryNotShipped',
    })
    expect(validateAddress({ ...f, country_code: 'fr' }, t, { email: 'a.b@example.com', countries: ['fr'] })).toEqual({})
  })

  it('trims what it sends', () => {
    expect(cleanAddress(addressForm({ city: '  Paris ', phone: ' ' })).city).toBe('Paris')
  })
})
