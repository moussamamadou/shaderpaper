import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'

/**
 * Checkout helpers (from MapAndSky's components/checkout/constants.ts).
 *
 * The manual provider (`pp_system_default`) takes no money: Medusa marks the
 * payment authorised without contacting anyone. When it is the only provider
 * the store is in test mode, and every page that could suggest a payment says
 * so (SPEC §7: never present a manual-provider order as paid).
 */
export const isStripeLike = (providerId?: string | null) =>
  Boolean(providerId?.startsWith('pp_stripe_') || providerId?.startsWith('pp_medusa-'))

export const isManual = (providerId?: string | null) => Boolean(providerId?.startsWith('pp_system_default'))

/** Test mode: providers are known and every one of them is the manual one. */
export const isTestMode = (providers: { id: string }[] | null | undefined) =>
  !!providers?.length && providers.every((p) => isManual(p.id))

/** i18n key of a provider's name. */
export const paymentTitleKey = (providerId?: string | null) => {
  if (isManual(providerId)) return 'checkout.payManual'
  if (isStripeLike(providerId)) return 'checkout.payCard'
  if (providerId?.startsWith('pp_paypal')) return 'checkout.payPaypal'
  return 'checkout.payOther'
}

/** The message of a failed $fetch (Nitro error body) or any error. */
export const errorText = (err: unknown) =>
  (err as { data?: { message?: string } })?.data?.message ?? (err instanceof Error ? err.message : String(err))

/** Stripe instances shared by the payment wrapper with the card field and the place-order button. */
export type StripeCheckoutContext = {
  ready: Ref<boolean>
  stripe: ShallowRef<Stripe | null>
  elements: ShallowRef<StripeElements | null>
  card: ShallowRef<StripeCardElement | null>
}
export const StripeContextKey: InjectionKey<StripeCheckoutContext> = Symbol('checkout-stripe')

export const CHECKOUT_STEPS = ['address', 'delivery', 'payment', 'review'] as const
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]
