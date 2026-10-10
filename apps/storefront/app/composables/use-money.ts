/**
 * Money in the visitor's region: Medusa amounts are decimals (never divided
 * by 100), formatted in English with the country's conventions.
 */
export function useMoney() {
  const countryCode = useCountryCode()
  const format = (amount: number | null | undefined, currency: string | null | undefined, opts: { whole?: boolean } = {}) => {
    if (amount == null || !currency) return ''
    const whole = opts.whole && Number.isInteger(amount)
    return convertToLocale({
      amount,
      currency_code: currency,
      locale: intlLocaleFor(countryCode.value),
      ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    })
  }
  return { format }
}
