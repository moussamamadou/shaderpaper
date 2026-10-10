<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'
import { StripeContextKey } from '~/utils/checkout'

/**
 * Stripe for the checkout (MapAndSky's PaymentWrapper): loads Stripe.js once,
 * only when the cart has a pending Stripe-like payment session and a
 * publishable key is configured (NUXT_PUBLIC_STRIPE_KEY or the Medusa
 * Payments key), and provides the instances to the card field and the
 * place-order button. Without a key nothing loads and `ready` stays false.
 */
const props = defineProps<{ cart: HttpTypes.StoreCart }>()
const config = useRuntimeConfig()
const stripeKey = String(config.public.stripeKey || config.public.medusaPaymentsPublishableKey || '')
const accountId = String(config.public.medusaPaymentsAccountId || '')

let stripePromise: Promise<Stripe | null> | null = null
const loadOnce = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js')
    stripePromise = loadStripe(stripeKey, accountId ? { stripeAccount: accountId } : undefined)
  }
  return stripePromise
}

const ready = ref(false)
const stripe = shallowRef<Stripe | null>(null)
const elements = shallowRef<StripeElements | null>(null)
const card = shallowRef<StripeCardElement | null>(null)
provide(StripeContextKey, { ready, stripe, elements, card })

const session = computed(() => props.cart.payment_collection?.payment_sessions?.find((s) => s.status === 'pending'))
const clientSecret = computed(() => session.value?.data?.client_secret as string | undefined)
const usesStripe = computed(() => isStripeLike(session.value?.provider_id) && !!stripeKey)

watch(
  [usesStripe, clientSecret],
  async ([active, secret]) => {
    if (!import.meta.client) return
    if (!active || !secret) {
      ready.value = false
      return
    }
    stripe.value ??= await loadOnce()
    if (!stripe.value) {
      ready.value = false
      return
    }
    card.value?.destroy()
    card.value = null
    elements.value = stripe.value.elements({ clientSecret: secret })
    ready.value = true
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  card.value?.destroy()
  card.value = null
})
</script>

<template>
  <slot />
</template>
