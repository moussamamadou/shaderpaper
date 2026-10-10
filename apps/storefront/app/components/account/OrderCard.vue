<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'

/** An order in the history: number, date, items as thumbnails, total, and a test-order tag for manual-provider orders. */
const props = defineProps<{ order: HttpTypes.StoreOrder }>()
const cc = useCountryCode()
const { format } = useMoney()
const date = computed(() => (props.order.created_at ? new Date(props.order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''))
const count = computed(() => (props.order.items ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0))
const manual = computed(() => isManual(props.order.payment_collections?.flatMap((c) => c.payments ?? [])[0]?.provider_id))
</script>

<template>
  <article class="flex flex-col gap-4 rounded-xs border border-line bg-surface p-4 md:p-5" data-testid="order-card">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="type-body font-medium">{{ $t('order.numberShort', { n: order.display_id }) }}</h3>
      <UiBadge v-if="manual" tone="warning">{{ $t('order.testTag') }}</UiBadge>
    </div>
    <div class="flex gap-2">
      <PosterThumb
        v-for="item in (order.items ?? []).slice(0, 4)"
        :key="item.id"
        :src="lineDesign(item.metadata)?.thumbnail"
        :fallback="item.thumbnail"
        :width="56"
      />
    </div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <p class="type-body-s text-ink-2">{{ date }} · {{ $t('cart.itemCount', { n: count }, count) }} · {{ format(order.total, order.currency_code) }}</p>
      <UiButton variant="secondary" size="sm" :to="`/${cc}/account/orders/${order.id}`">{{ $t('order.details') }}</UiButton>
    </div>
  </article>
</template>
