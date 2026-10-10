<script setup lang="ts">
import { ChevronDown, ShoppingBag } from 'lucide-vue-next'
import type { CheckoutStep } from '~/utils/checkout'

/**
 * Checkout (checkout layout): four steps driven by ?step=address|delivery|
 * payment|review, each a question; the order summary beside them (a
 * disclosure at the top on phones). 404 without a cart, like MapAndSky. When
 * the only payment provider is the manual one the whole page carries the
 * test-mode banner: no money is taken.
 */
definePageMeta({ layout: 'checkout' })
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
useSeoMeta({ title: () => t('checkout.title'), robots: 'noindex' })

const { cart, retrieveCart, listCartShippingMethods, listCartPaymentMethods } = useCart()
const { customer, retrieveCustomer } = useCustomer()
await useAsyncData('checkout-page', async () => {
  const c = await retrieveCart()
  if (c) await retrieveCustomer()
  return { ok: !!c }
})
if (!cart.value) {
  throw createError({ statusCode: 404, statusMessage: t('errors.noCart'), fatal: true })
}

const addressKey = computed(() => {
  const a = cart.value?.shipping_address
  return [cart.value?.id, a?.address_1, a?.postal_code, a?.city, a?.country_code].join('|')
})
const { data: methods } = await useAsyncData(
  'checkout-methods',
  async () => {
    if (!cart.value) return { shipping: null, payment: null }
    const [shipping, payment] = await Promise.all([
      cart.value.shipping_address ? listCartShippingMethods(cart.value.id) : Promise.resolve(null),
      listCartPaymentMethods(cart.value.region?.id ?? ''),
    ])
    return { shipping, payment }
  },
  { watch: [addressKey] },
)
const providers = computed(() => methods.value?.payment ?? null)
const testMode = computed(() => isTestMode(providers.value))

const done = computed<Record<CheckoutStep, boolean>>(() => ({
  address: !!cart.value?.shipping_address?.address_1 && !!cart.value?.email,
  delivery: !!cart.value?.shipping_methods?.length,
  payment: !!cart.value?.payment_collection?.payment_sessions?.some((s) => s.status === 'pending'),
  review: false,
}))
/** The open step: ?step=, but never past the first unfinished one. */
const step = computed<CheckoutStep>(() => {
  const asked = (CHECKOUT_STEPS as readonly string[]).includes(String(route.query.step)) ? (route.query.step as CheckoutStep) : 'address'
  const firstOpen = CHECKOUT_STEPS.find((s) => !done.value[s]) ?? 'review'
  return CHECKOUT_STEPS.indexOf(asked) > CHECKOUT_STEPS.indexOf(firstOpen) ? firstOpen : asked
})
// Move focus to the step heading when the step changes (keyboard and screen-reader users land on it).
watch(step, async (s) => {
  await nextTick()
  document.getElementById(`step-${s}`)?.closest('section')?.querySelector<HTMLElement>('h2')?.focus()
})

const items = computed(() => cart.value?.items ?? [])
const { format } = useMoney()
</script>

<template>
  <div v-if="cart" class="page pb-24 pt-6 lg:pt-10">
    <UiBanner v-if="testMode" tone="test" :title="$t('checkout.testModeTitle')" class="mb-8" data-testid="test-mode-banner">
      {{ $t('checkout.testModeBody') }}
    </UiBanner>

    <div v-if="!items.length" class="py-10">
      <UiEmptyState :title="$t('cart.emptyTitle')" :body="$t('checkout.emptyBody')">
        <template #icon><ShoppingBag :size="28" aria-hidden="true" /></template>
        <UiButton :to="`/${cc}/shop`">{{ $t('cart.browse') }}</UiButton>
      </UiEmptyState>
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-12 lg:gap-6">
      <!-- Phone: summary disclosure -->
      <details class="group rounded-xs border border-line bg-surface lg:hidden">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span class="flex items-center gap-2 type-body-s font-medium">
            {{ $t('checkout.showSummary') }}
            <ChevronDown :size="16" class="transition-transform duration-base group-open:rotate-180" aria-hidden="true" />
          </span>
          <span class="type-price">{{ format(cart.total ?? 0, cart.currency_code) }}</span>
        </summary>
        <div class="border-t border-line px-4 pb-4">
          <ul class="divide-y divide-line">
            <CartLine v-for="item in items" :key="item.id" :item="item" :currency="cart.currency_code" compact :editable="false" />
          </ul>
          <CartSummary :totals="cart" :has-shipping="!!cart.shipping_methods?.length" class="mt-2" />
        </div>
      </details>

      <div class="flex flex-col gap-10 lg:col-span-7">
        <h1 class="sr-only">{{ $t('checkout.title') }}</h1>
        <CheckoutStepper :current="step" :done="done" />
        <CheckoutPaymentWrapper :cart="cart">
          <div class="flex flex-col divide-y divide-line">
            <div class="pb-10"><CheckoutAddressStep :key="`a-${cart.id}`" :cart="cart" :customer="customer" :open="step === 'address'" /></div>
            <div class="py-10"><CheckoutDeliveryStep :cart="cart" :options="methods?.shipping ?? null" :open="step === 'delivery'" /></div>
            <div class="py-10"><CheckoutPaymentStep :cart="cart" :providers="providers" :open="step === 'payment'" /></div>
            <div class="pt-10"><CheckoutReviewStep :cart="cart" :open="step === 'review'" /></div>
          </div>
        </CheckoutPaymentWrapper>
      </div>

      <aside class="hidden lg:col-span-4 lg:col-start-9 lg:block" :aria-label="$t('cart.summary')">
        <div class="sticky top-[96px] flex flex-col gap-4 rounded-xs border border-line bg-surface p-6">
          <h2 class="type-h3">{{ $t('checkout.inYourCart', { n: items.length }, items.length) }}</h2>
          <ul class="max-h-[50vh] divide-y divide-line overflow-y-auto">
            <CartLine v-for="item in items" :key="item.id" :item="item" :currency="cart.currency_code" compact :editable="false" />
          </ul>
          <CartSummary :totals="cart" :has-shipping="!!cart.shipping_methods?.length" />
        </div>
      </aside>
    </div>
  </div>
</template>
