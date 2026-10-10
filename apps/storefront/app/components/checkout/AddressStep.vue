<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import { Pencil } from 'lucide-vue-next'
import type { AddressErrors, AddressForm } from '~/utils/address-form'

/**
 * Step 1, "Where should we send your poster?": email, shipping address,
 * billing address (same by default). Validated here before anything is sent:
 * an empty submit lists every problem in an alert at the top, marks each
 * field and moves focus to the first one. Saving goes through
 * POST /api/cart/addresses (MapAndSky's setAddresses), then on to delivery.
 */
const props = defineProps<{ cart: HttpTypes.StoreCart; customer: HttpTypes.StoreCustomer | null; open: boolean }>()
const route = useRoute()
const { t } = useI18n()
const { setAddresses, retrieveCart } = useCart()

const countries = computed(() =>
  (props.cart.region?.countries ?? [])
    .map((c) => ({ value: c.iso_2 ?? '', label: c.display_name ?? c.name ?? (c.iso_2 ?? '').toUpperCase() }))
    .filter((c) => c.value)
    .sort((a, b) => a.label.localeCompare(b.label)),
)
const countryCodes = computed(() => countries.value.map((c) => c.value))

const email = ref(props.cart.email || props.customer?.email || '')
const shipping = reactive<AddressForm>(addressForm(props.cart.shipping_address))
if (!shipping.country_code && countryCodes.value.includes(String(route.params.countryCode ?? ''))) {
  shipping.country_code = String(route.params.countryCode)
}
const sameAsBilling = ref(
  props.cart.shipping_address && props.cart.billing_address ? compareAddresses(props.cart.shipping_address, props.cart.billing_address) : true,
)
const billing = reactive<AddressForm>(addressForm(props.cart.billing_address))

// Saved addresses (signed-in customers) in this region.
const saved = computed(() => (props.customer?.addresses ?? []).filter((a) => a.country_code && countryCodes.value.includes(a.country_code)))
const savedChoice = ref('')
const savedOptions = computed(() =>
  saved.value.map((a) => ({ value: a.id, label: [`${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(), a.address_1, a.city].filter(Boolean).join(', ') })),
)
watch(savedChoice, (id) => {
  const a = saved.value.find((x) => x.id === id)
  if (a) Object.assign(shipping, addressForm(a))
})

const errors = ref<AddressErrors>({})
const billingErrors = ref<AddressErrors>({})
const summary = ref<{ id: string; text: string }[]>([])
const serverError = ref<string | null>(null)
const pending = ref(false)
const summaryEl = ref<HTMLElement | null>(null)
const shippingFields = ref<{ focus: (k: keyof AddressForm) => void } | null>(null)
const billingFields = ref<{ focus: (k: keyof AddressForm) => void } | null>(null)
const emailField = ref<{ focus: () => void } | null>(null)

const submit = async () => {
  serverError.value = null
  errors.value = validateAddress(shipping, t, { email: email.value, countries: countryCodes.value })
  billingErrors.value = sameAsBilling.value ? {} : validateAddress(billing, t, { countries: countryCodes.value })
  const list: { id: string; text: string }[] = []
  for (const k of ADDRESS_FIELD_ORDER) {
    const m = errors.value[k]
    if (m) list.push({ id: k === 'email' ? 'email' : `shipping.${k}`, text: m })
  }
  for (const k of ADDRESS_FIELD_ORDER) {
    const m = billingErrors.value[k]
    if (m) list.push({ id: `billing.${k}`, text: `${t('checkout.billingPrefix')}: ${m}` })
  }
  summary.value = list
  if (list.length) {
    await nextTick()
    summaryEl.value?.focus()
    return
  }
  pending.value = true
  try {
    const result = await setAddresses({
      email: email.value.trim(),
      shipping_address: { ...cleanAddress(shipping) },
      same_as_billing: sameAsBilling.value,
      billing_address: sameAsBilling.value ? undefined : { ...cleanAddress(billing) },
    })
    if (!result.success) {
      serverError.value = result.error
      return
    }
    await retrieveCart()
    await navigateTo(result.redirect)
  } catch (err) {
    serverError.value = errorText(err)
  } finally {
    pending.value = false
  }
}
const focusField = (id: string) => {
  if (id === 'email') return emailField.value?.focus()
  const [scope, k] = id.split('.') as ['shipping' | 'billing', keyof AddressForm]
  ;(scope === 'billing' ? billingFields.value : shippingFields.value)?.focus(k)
}

const done = computed(() => !!props.cart.shipping_address?.address_1 && !!props.cart.email)
const addr = computed(() => props.cart.shipping_address)
const bill = computed(() => props.cart.billing_address)
const countryName = (code?: string | null) => countries.value.find((c) => c.value === code)?.label ?? (code ?? '').toUpperCase()
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="step-address" data-testid="step-address">
    <div class="flex items-baseline justify-between gap-4">
      <h2 id="step-address" tabindex="-1" class="type-h2 focus:outline-none">{{ $t('checkout.addressTitle') }}</h2>
      <UiButton v-if="!open && done" variant="link" :to="{ path: route.path, query: { step: 'address' } }" data-testid="edit-address">
        <Pencil :size="14" aria-hidden="true" />{{ $t('checkout.edit') }}
      </UiButton>
    </div>

    <form v-if="open" class="flex flex-col gap-8" novalidate data-testid="address-form" @submit.prevent="submit">
      <div
        v-if="summary.length"
        ref="summaryEl"
        tabindex="-1"
        role="alert"
        class="rounded-xs border border-danger/40 bg-danger-bg p-4 focus-visible:shadow-focus"
        data-testid="address-errors"
      >
        <p class="type-body-s font-medium text-ink">{{ $t('checkout.fixErrors', { n: summary.length }, summary.length) }}</p>
        <ul class="mt-2 flex list-disc flex-col gap-1 pl-5 type-body-s text-danger">
          <li v-for="s in summary" :key="s.id"><a href="#" class="underline underline-offset-2" @click.prevent="focusField(s.id)">{{ s.text }}</a></li>
        </ul>
      </div>

      <fieldset class="flex flex-col gap-4">
        <legend class="mb-4 type-label">{{ $t('checkout.contact') }}</legend>
        <UiTextField ref="emailField" v-model="email" :label="$t('address.email')" name="email" type="email" required :error="errors.email" autocomplete="email" inputmode="email" />
      </fieldset>

      <fieldset class="flex flex-col gap-4">
        <legend class="mb-4 type-label">{{ $t('checkout.shippingAddress') }}</legend>
        <UiSelect
          v-if="savedOptions.length"
          v-model="savedChoice"
          :label="$t('checkout.savedAddress')"
          name="saved_address"
          :options="savedOptions"
          :placeholder="$t('checkout.savedAddressPlaceholder')"
        />
        <CheckoutAddressFields ref="shippingFields" :form="shipping" :errors="errors" :countries="countries" section="shipping" name="shipping" />
      </fieldset>

      <div class="flex flex-col gap-4">
        <UiCheckbox v-model="sameAsBilling" :label="$t('checkout.sameAsBilling')" name="same_as_billing" data-testid="same-as-billing" />
        <fieldset v-if="!sameAsBilling" class="flex flex-col gap-4">
          <legend class="mb-4 type-label">{{ $t('checkout.billingAddress') }}</legend>
          <CheckoutAddressFields ref="billingFields" :form="billing" :errors="billingErrors" :countries="countries" section="billing" name="billing" />
        </fieldset>
      </div>

      <UiBanner v-if="serverError" tone="danger" :title="$t('checkout.saveFailed')" live>{{ serverError }}</UiBanner>
      <UiButton type="submit" size="lg" :loading="pending" class="self-start max-sm:w-full" data-testid="submit-address">{{ $t('checkout.continueToDelivery') }}</UiButton>
    </form>

    <div v-else-if="done && addr" class="grid gap-6 type-body-s text-ink-2 sm:grid-cols-3">
      <div>
        <p class="type-label text-ink">{{ $t('checkout.shippingAddress') }}</p>
        <p class="mt-2">{{ addr.first_name }} {{ addr.last_name }}<br />{{ addr.address_1 }}<br />{{ addr.postal_code }} {{ addr.city }}<br />{{ countryName(addr.country_code) }}</p>
      </div>
      <div>
        <p class="type-label text-ink">{{ $t('checkout.contact') }}</p>
        <p class="mt-2 break-all">{{ cart.email }}<br v-if="addr.phone" />{{ addr.phone }}</p>
      </div>
      <div>
        <p class="type-label text-ink">{{ $t('checkout.billingAddress') }}</p>
        <p v-if="sameAsBilling || !bill" class="mt-2">{{ $t('checkout.sameAsShipping') }}</p>
        <p v-else class="mt-2">{{ bill.first_name }} {{ bill.last_name }}<br />{{ bill.address_1 }}<br />{{ bill.postal_code }} {{ bill.city }}<br />{{ countryName(bill.country_code) }}</p>
      </div>
    </div>
  </section>
</template>
