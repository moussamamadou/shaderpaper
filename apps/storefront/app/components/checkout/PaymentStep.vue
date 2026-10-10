<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import { CreditCard, FlaskConical, Pencil } from 'lucide-vue-next'

/**
 * Step 3, "How would you like to pay?": the region's payment providers.
 * Stripe (card field) when the backend offers it and a key is configured;
 * the manual provider otherwise, which takes no money and is labelled as a
 * test payment. Continuing opens a payment session, then the review.
 */
const props = defineProps<{ cart: HttpTypes.StoreCart; providers: HttpTypes.StorePaymentProvider[] | null; open: boolean }>()
const route = useRoute()
const { t } = useI18n()
const { initiatePaymentSession, retrieveCart } = useCart()

const session = computed(() => props.cart.payment_collection?.payment_sessions?.find((s) => s.status === 'pending'))
const selected = ref<string>(session.value?.provider_id ?? (props.providers?.length === 1 ? props.providers[0]!.id : ''))
const loading = ref(false)
const error = ref<string | null>(null)
const cardError = ref<string | null>(null)
const cardComplete = ref(false)
const testMode = computed(() => isTestMode(props.providers))

watch(selected, async (id) => {
  error.value = null
  if (isStripeLike(id)) {
    try {
      await initiatePaymentSession(props.cart, { provider_id: id })
      await retrieveCart()
    } catch (err) {
      error.value = errorText(err)
    }
  }
})

const canContinue = computed(() => !!selected.value && (!isStripeLike(selected.value) || cardComplete.value))
const submit = async () => {
  if (!selected.value) {
    error.value = t('checkout.choosePayment')
    return
  }
  loading.value = true
  error.value = null
  try {
    if (session.value?.provider_id !== selected.value) {
      await initiatePaymentSession(props.cart, { provider_id: selected.value })
      await retrieveCart()
    }
    await navigateTo({ path: route.path, query: { step: 'review' } })
  } catch (err) {
    error.value = errorText(err)
  } finally {
    loading.value = false
  }
}
const done = computed(() => !!session.value && !!props.cart.shipping_methods?.length)
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="step-payment" data-testid="step-payment">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="step-payment" tabindex="-1" :class="['type-h2', !open && !done ? 'text-ink-3' : '']">{{ $t('checkout.paymentTitle') }}</h2>
      <UiButton v-if="!open && done" variant="link" :to="{ path: route.path, query: { step: 'payment' } }" data-testid="edit-payment">
        <Pencil :size="14" aria-hidden="true" />{{ $t('checkout.edit') }}
      </UiButton>
    </div>

    <div v-if="open" class="flex flex-col gap-6">
      <UiBanner v-if="testMode" tone="test" :title="$t('checkout.testModeTitle')" data-testid="test-mode-banner-payment">
        {{ $t('checkout.testModeBody') }}
      </UiBanner>
      <fieldset v-if="providers?.length" class="flex flex-col gap-2" data-testid="payment-options">
        <legend class="sr-only">{{ $t('checkout.paymentTitle') }}</legend>
        <UiRadio
          v-for="p in providers"
          :key="p.id"
          v-model="selected"
          :value="p.id"
          name="payment_provider"
          :label="$t(paymentTitleKey(p.id))"
          :description="isManual(p.id) ? $t('checkout.payManualHelp') : ''"
          data-testid="payment-option"
        >
          <template #aside>
            <FlaskConical v-if="isManual(p.id)" :size="18" class="text-warning" aria-hidden="true" />
            <CreditCard v-else :size="18" class="text-ink-2" aria-hidden="true" />
          </template>
        </UiRadio>
      </fieldset>
      <UiBanner v-else tone="warning" :title="$t('checkout.noPaymentTitle')">{{ $t('checkout.noPaymentBody') }}</UiBanner>

      <CheckoutStripeCard :active="isStripeLike(selected)" @error="(m) => (cardError = m)" @complete="(c) => (cardComplete = c)" />
      <p v-if="cardError" class="type-body-s text-danger" role="alert">{{ cardError }}</p>
      <UiBanner v-if="error" tone="danger" :title="$t('checkout.paymentFailed')" live>{{ error }}</UiBanner>
      <UiButton size="lg" class="self-start max-sm:w-full" :loading="loading" :disabled="!canContinue" data-testid="submit-payment" @click="submit">
        {{ $t('checkout.continueToReview') }}
      </UiButton>
    </div>

    <div v-else-if="done && session" class="type-body-s text-ink-2">
      <p class="type-label text-ink">{{ $t('checkout.paymentMethod') }}</p>
      <p class="mt-2">{{ $t(paymentTitleKey(session.provider_id)) }}</p>
    </div>
  </section>
</template>
