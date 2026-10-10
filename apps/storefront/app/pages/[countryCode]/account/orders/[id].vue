<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

/** One order of the signed-in customer; 404 when it cannot be read. */
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
const { retrieveOrder } = useOrders()
const { data: order } = await useAsyncData(
  () => `account-order-${route.params.id}`,
  () => retrieveOrder(String(route.params.id)).catch(() => null),
)
if (!order.value) throw createError({ statusCode: 404, statusMessage: t('errors.orderNotFound'), fatal: true })
const manual = computed(() => isManual(order.value?.payment_collections?.flatMap((c) => c.payments ?? [])[0]?.provider_id))
useSeoMeta({ title: () => t('order.numberShort', { n: order.value?.display_id ?? '' }) })
</script>

<template>
  <div v-if="order" class="flex flex-col gap-6">
    <NuxtLink :to="`/${cc}/account/orders`" class="inline-flex min-h-11 items-center gap-1 self-start type-body-s text-ink-2 hover:text-ink md:min-h-0">
      <ArrowLeft :size="16" aria-hidden="true" />{{ $t('account.backToOrders') }}
    </NuxtLink>
    <h1 class="type-h1">{{ $t('order.numberShort', { n: order.display_id }) }}</h1>
    <UiBanner v-if="manual" tone="test" :title="$t('order.testOrderTitle')">{{ $t('order.testOrderBody') }}</UiBanner>
    <OrderDetails :order="order" />
  </div>
</template>
