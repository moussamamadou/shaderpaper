<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'

/**
 * An order: what was ordered (with each poster's design), where it goes, how
 * it travels, and the totals. The payment line says plainly what happened:
 * a manual-provider order is a test order and no payment was taken.
 */
const props = defineProps<{ order: HttpTypes.StoreOrder }>()
const { t } = useI18n()
const { format } = useMoney()

const payments = computed(() => props.order.payment_collections?.flatMap((c) => c.payments ?? []) ?? [])
const providerId = computed(() => payments.value[0]?.provider_id ?? null)
const manual = computed(() => isManual(providerId.value))
const paymentText = computed(() => {
  if (manual.value) return t('order.paymentManual')
  if (!providerId.value) return t('order.paymentNone')
  return t('order.paymentStatus', { provider: t(paymentTitleKey(providerId.value)), status: t(`order.status.${props.order.payment_status}`, String(props.order.payment_status ?? '')) })
})
const placed = computed(() => (props.order.created_at ? new Date(props.order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''))
const addr = computed(() => props.order.shipping_address)
const method = computed(() => props.order.shipping_methods?.[0])
</script>

<template>
  <div class="flex flex-col gap-8">
    <dl class="grid grid-cols-2 gap-4 rounded-xs border border-line bg-surface p-5 type-body-s sm:grid-cols-4">
      <div>
        <dt class="type-label text-ink-3">{{ $t('order.number') }}</dt>
        <dd class="mt-1 font-medium tabular-nums" data-testid="order-number">#{{ order.display_id }}</dd>
      </div>
      <div>
        <dt class="type-label text-ink-3">{{ $t('order.date') }}</dt>
        <dd class="mt-1">{{ placed }}</dd>
      </div>
      <div class="col-span-2">
        <dt class="type-label text-ink-3">{{ $t('order.email') }}</dt>
        <dd class="mt-1 break-all">{{ order.email }}</dd>
      </div>
    </dl>

    <section aria-labelledby="order-items">
      <h2 id="order-items" class="type-h3">{{ $t('order.items') }}</h2>
      <ul class="mt-2 divide-y divide-line border-y border-line">
        <CartLine v-for="item in order.items ?? []" :key="item.id" :item="item as never" :currency="order.currency_code" :editable="false" />
      </ul>
    </section>

    <div class="grid gap-8 sm:grid-cols-3">
      <section v-if="addr" aria-labelledby="order-ship">
        <h2 id="order-ship" class="type-label">{{ $t('checkout.shippingAddress') }}</h2>
        <p class="mt-2 type-body-s text-ink-2">
          {{ addr.first_name }} {{ addr.last_name }}<br />{{ addr.address_1 }}<br />{{ addr.postal_code }} {{ addr.city }}<br />{{ (addr.country_code ?? '').toUpperCase() }}
        </p>
      </section>
      <section v-if="method" aria-labelledby="order-delivery">
        <h2 id="order-delivery" class="type-label">{{ $t('checkout.deliveryMethod') }}</h2>
        <p class="mt-2 type-body-s text-ink-2">{{ method.name }} · {{ method.amount === 0 ? $t('checkout.free') : format(method.amount, order.currency_code) }}</p>
      </section>
      <section aria-labelledby="order-payment">
        <h2 id="order-payment" class="type-label">{{ $t('checkout.paymentMethod') }}</h2>
        <p class="mt-2 type-body-s text-ink-2" data-testid="order-payment">{{ paymentText }}</p>
      </section>
    </div>

    <div class="sm:ml-auto sm:w-[320px]">
      <CartSummary :totals="order" has-shipping />
    </div>
  </div>
</template>
