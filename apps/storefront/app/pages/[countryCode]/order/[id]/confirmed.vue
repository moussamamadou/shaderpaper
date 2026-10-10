<script setup lang="ts">
import { CircleCheck } from 'lucide-vue-next'

/**
 * Order confirmation. A manual-provider order is a test: the page says
 * "Test order — no payment was taken" before anything else. 404 when the
 * order cannot be read (MapAndSky parity).
 */
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
const { retrieveOrder } = useOrders()
const { data: order } = await useAsyncData(
  () => `order-confirmed-${route.params.id}`,
  () => retrieveOrder(String(route.params.id)).catch(() => null),
)
if (!order.value) {
  throw createError({ statusCode: 404, statusMessage: t('errors.orderNotFound'), fatal: true })
}
const manual = computed(() => isManual(order.value?.payment_collections?.flatMap((c) => c.payments ?? [])[0]?.provider_id))
useSeoMeta({ title: () => t('order.confirmedTitle'), robots: 'noindex' })
</script>

<template>
  <div v-if="order" class="page max-w-[960px] pb-24 pt-8 lg:pt-14">
    <div class="flex flex-col gap-6">
      <UiBanner v-if="manual" tone="test" :title="$t('order.testOrderTitle')" data-testid="test-order-banner">
        {{ $t('order.testOrderBody') }}
      </UiBanner>
      <div class="flex flex-col gap-3">
        <CircleCheck :size="32" class="text-success" aria-hidden="true" />
        <h1 class="type-h1">{{ manual ? $t('order.placedTestTitle') : $t('order.placedTitle') }}</h1>
        <p class="max-w-prose type-body text-ink-2">{{ $t('order.placedBody', { email: order.email }) }}</p>
      </div>
      <InfoTbw :what="$t('order.tbwNext')" compact />
      <OrderDetails :order="order" />
      <div class="flex flex-wrap gap-3">
        <UiButton :to="`/${cc}/shop`">{{ $t('order.continue') }}</UiButton>
        <UiButton :to="`/${cc}/account/orders`" variant="secondary">{{ $t('order.viewOrders') }}</UiButton>
      </div>
    </div>
  </div>
</template>
