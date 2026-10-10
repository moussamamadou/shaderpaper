<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import { Pencil } from 'lucide-vue-next'

/**
 * Step 2, "How should it travel?": the shipping options Medusa offers for the
 * address (pickup options are left out: posters ship). Choosing one sets it
 * on the cart straight away; "calculated" options are priced first. Their
 * names and prices come from the backend; this page adds no promise of its own.
 */
const props = defineProps<{ cart: HttpTypes.StoreCart; options: HttpTypes.StoreCartShippingOption[] | null; open: boolean }>()
const route = useRoute()
const { t } = useI18n()
const { setShippingMethod, calculatePriceForShippingOption } = useCart()
const { format } = useMoney()

type Extras = { service_zone?: { fulfillment_set?: { type?: string } } }
const shippable = computed(() =>
  (props.options ?? []).filter((o) => (o as unknown as Extras).service_zone?.fulfillment_set?.type !== 'pickup'),
)
const calculated = ref<Record<string, number>>({})
const pricing = ref(false)
watch(
  () => props.options,
  async () => {
    if (!import.meta.client) return
    const calc = shippable.value.filter((o) => o.price_type === 'calculated')
    if (!calc.length) return
    pricing.value = true
    const results = await Promise.allSettled(calc.map((o) => calculatePriceForShippingOption(o.id, props.cart.id)))
    const map: Record<string, number> = {}
    for (const r of results) if (r.status === 'fulfilled' && r.value?.id) map[r.value.id] = r.value.amount ?? 0
    calculated.value = map
    pricing.value = false
  },
  { immediate: true },
)
const priceOf = (o: HttpTypes.StoreCartShippingOption) =>
  o.price_type === 'calculated' ? calculated.value[o.id] : o.amount
const priceText = (o: HttpTypes.StoreCartShippingOption) => {
  const p = priceOf(o)
  if (p == null) return pricing.value ? t('checkout.pricing') : t('checkout.priceUnavailable')
  return p === 0 ? t('checkout.free') : format(p, props.cart.currency_code)
}

const selected = ref<string | null>(props.cart.shipping_methods?.at(-1)?.shipping_option_id ?? null)
const saving = ref(false)
const error = ref<string | null>(null)
const status = ref('')
watch(selected, async (id, prev) => {
  if (!id || id === props.cart.shipping_methods?.at(-1)?.shipping_option_id) return
  error.value = null
  saving.value = true
  try {
    await setShippingMethod({ cartId: props.cart.id, shippingMethodId: id })
    status.value = t('checkout.deliverySaved', { name: shippable.value.find((o) => o.id === id)?.name ?? '' })
  } catch (err) {
    selected.value = prev ?? null
    error.value = errorText(err)
  } finally {
    saving.value = false
  }
})
const chosenError = ref<string | null>(null)
const next = () => {
  if (!props.cart.shipping_methods?.length) {
    chosenError.value = t('checkout.chooseDelivery')
    return
  }
  chosenError.value = null
  navigateTo({ path: route.path, query: { step: 'payment' } })
}
const last = computed(() => props.cart.shipping_methods?.at(-1))
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="step-delivery" data-testid="step-delivery">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="step-delivery" tabindex="-1" :class="['type-h2', !open && !last ? 'text-ink-3' : '']">{{ $t('checkout.deliveryTitle') }}</h2>
      <UiButton v-if="!open && last && cart.shipping_address" variant="link" :to="{ path: route.path, query: { step: 'delivery' } }" data-testid="edit-delivery">
        <Pencil :size="14" aria-hidden="true" />{{ $t('checkout.edit') }}
      </UiButton>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>

    <div v-if="open" class="flex flex-col gap-6">
      <fieldset v-if="shippable.length" class="flex flex-col gap-2" :aria-describedby="chosenError ? 'delivery-error' : undefined" data-testid="delivery-options">
        <legend class="sr-only">{{ $t('checkout.deliveryTitle') }}</legend>
        <UiRadio
          v-for="o in shippable"
          :key="o.id"
          v-model="selected"
          :value="o.id"
          name="shipping_option"
          :label="o.name"
          :disabled="saving || (o.price_type === 'calculated' && !pricing && calculated[o.id] == null)"
          data-testid="delivery-option"
        >
          <template #aside>
            <span class="type-body-s tabular-nums text-ink">{{ priceText(o) }}</span>
          </template>
        </UiRadio>
      </fieldset>
      <UiBanner v-else tone="warning" :title="$t('checkout.noDeliveryTitle')">{{ $t('checkout.noDeliveryBody') }}</UiBanner>
      <p v-if="chosenError" id="delivery-error" class="type-body-s text-danger" role="alert">{{ chosenError }}</p>
      <UiBanner v-if="error" tone="danger" :title="$t('checkout.deliveryFailed')" live>{{ error }}</UiBanner>
      <UiButton size="lg" class="self-start max-sm:w-full" :loading="saving" data-testid="submit-delivery" @click="next">{{ $t('checkout.continueToPayment') }}</UiButton>
    </div>

    <div v-else-if="last" class="type-body-s text-ink-2">
      <p class="type-label text-ink">{{ $t('checkout.deliveryMethod') }}</p>
      <p class="mt-2">{{ last.name }} · {{ last.amount === 0 ? $t('checkout.free') : format(last.amount, cart.currency_code) }}</p>
    </div>
  </section>
</template>
