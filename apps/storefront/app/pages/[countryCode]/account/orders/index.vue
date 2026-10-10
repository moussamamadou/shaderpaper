<script setup lang="ts">
import { Package } from 'lucide-vue-next'

/** Order history, newest first. */
const { listOrders } = useOrders()
const cc = useCountryCode()
const { t } = useI18n()
const { data: orders, status, error } = useAsyncData('account-orders', () => listOrders(50), { default: () => [] })
useSeoMeta({ title: () => t('account.orders') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="type-h1">{{ $t('account.orders') }}</h1>
    <div v-if="status === 'pending'" class="flex flex-col gap-4"><UiSkeleton v-for="i in 3" :key="i" variant="block" class="h-[160px]" /></div>
    <UiBanner v-else-if="error" tone="danger" :title="$t('errors.ordersTitle')">{{ $t('errors.ordersBody') }}</UiBanner>
    <div v-else-if="orders.length" class="flex flex-col gap-4" data-testid="orders-list">
      <AccountOrderCard v-for="o in orders" :key="o.id" :order="o" />
    </div>
    <UiEmptyState v-else :title="$t('account.noOrdersTitle')" :body="$t('account.noOrdersBody')">
      <template #icon><Package :size="26" aria-hidden="true" /></template>
      <UiButton :to="`/${cc}/shop`">{{ $t('cart.browse') }}</UiButton>
    </UiEmptyState>
  </div>
</template>
