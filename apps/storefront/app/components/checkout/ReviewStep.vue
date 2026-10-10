<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import type { StripeCardElement } from '@stripe/stripe-js'
import { StripeContextKey } from '~/utils/checkout'

/**
 * Step 4, review and place the order (MapAndSky's Review + PaymentButton).
 * Stripe: confirm the card payment, then complete the cart. Manual provider:
 * complete the cart directly; the button says "Place test order" and the
 * page says no payment will be taken. Errors stay on the page.
 */
const props = defineProps<{ cart: HttpTypes.StoreCart; open: boolean }>()
const { t } = useI18n()
const { placeOrder } = useCart()
const stripeCtx = inject(StripeContextKey, null)

const session = computed(() => props.cart.payment_collection?.payment_sessions?.[0])
const kind = computed<'stripe' | 'manual' | 'none'>(() =>
  isStripeLike(session.value?.provider_id) ? 'stripe' : isManual(session.value?.provider_id) ? 'manual' : 'none',
)
const notReady = computed(
  () => !props.cart.shipping_address || !props.cart.billing_address || !props.cart.email || !props.cart.shipping_methods?.length || !session.value,
)
const submitting = ref(false)
const error = ref<string | null>(null)

const complete = async () => {
  try {
    const result = await placeOrder()
    if (result.type === 'order') {
      await navigateTo(result.redirect)
      return
    }
    error.value = result.error?.message ?? t('checkout.placeFailed')
  } catch (err) {
    error.value = errorText(err)
  } finally {
    submitting.value = false
  }
}

const payWithStripe = async () => {
  const stripe = stripeCtx?.stripe.value
  const elements = stripeCtx?.elements.value
  const card = (elements?.getElement('card') as StripeCardElement | null) ?? stripeCtx?.card.value ?? null
  if (!stripe || !elements || !card) {
    error.value = t('checkout.cardNotReady')
    submitting.value = false
    return
  }
  const pending = props.cart.payment_collection?.payment_sessions?.find((s) => s.status === 'pending')
  const b = props.cart.billing_address
  const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(pending?.data?.client_secret as string, {
    payment_method: {
      card,
      billing_details: {
        name: `${b?.first_name ?? ''} ${b?.last_name ?? ''}`.trim(),
        address: {
          city: b?.city ?? undefined,
          country: b?.country_code ?? undefined,
          line1: b?.address_1 ?? undefined,
          postal_code: b?.postal_code ?? undefined,
          state: b?.province ?? undefined,
        },
        email: props.cart.email ?? undefined,
        phone: b?.phone ?? undefined,
      },
    },
  })
  const intent = stripeError?.payment_intent ?? paymentIntent
  if (intent && (intent.status === 'requires_capture' || intent.status === 'succeeded')) {
    await complete()
    return
  }
  error.value = stripeError?.message ?? t('checkout.paymentFailed')
  submitting.value = false
}

const place = async () => {
  if (notReady.value || submitting.value) return
  error.value = null
  submitting.value = true
  if (kind.value === 'stripe') await payWithStripe()
  else if (kind.value === 'manual') await complete()
  else {
    error.value = t('checkout.choosePayment')
    submitting.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="step-review" data-testid="step-review">
    <h2 id="step-review" tabindex="-1" :class="['type-h2', !open ? 'text-ink-3' : '']">{{ $t('checkout.reviewTitle') }}</h2>
    <div v-if="open" class="flex flex-col gap-6">
      <p class="type-body text-ink-2">{{ $t('checkout.reviewBody') }}</p>
      <UiBanner v-if="kind === 'manual'" tone="test" :title="$t('checkout.testModeTitle')" data-testid="test-mode-banner-review">
        {{ $t('checkout.reviewManual') }}
      </UiBanner>
      <InfoTbw :what="$t('checkout.tbwTerms')" compact />
      <UiBanner v-if="error" tone="danger" :title="$t('checkout.placeFailed')" live data-testid="place-error">{{ error }}</UiBanner>
      <UiButton size="lg" class="self-start max-sm:w-full" :loading="submitting" :disabled="notReady" data-testid="place-order" @click="place">
        {{ kind === 'manual' ? $t('checkout.placeTestOrder') : $t('checkout.placeOrder') }}
      </UiButton>
    </div>
  </section>
</template>
