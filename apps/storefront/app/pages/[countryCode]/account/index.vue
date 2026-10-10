<script setup lang="ts">
import { Package } from 'lucide-vue-next'

/** Account overview: greeting, the latest orders, the default address and profile completeness. */
const { customer } = useCustomer()
const { listOrders } = useOrders()
const cc = useCountryCode()
const { t } = useI18n()
const { data: orders, status } = useAsyncData('account-recent-orders', () => listOrders(3).catch(() => []), { default: () => [] })
useSeoMeta({ title: () => t('account.overview') })
const address = computed(() => customer.value?.addresses?.find((a) => a.is_default_shipping) ?? customer.value?.addresses?.[0] ?? null)
</script>

<template>
  <div v-if="customer" class="flex flex-col gap-10">
    <header>
      <h1 class="type-h1" data-testid="account-greeting">{{ $t('account.hello', { name: customer.first_name || customer.email }) }}</h1>
      <p class="mt-2 type-body-s text-ink-2">{{ $t('account.signedInAs', { email: customer.email }) }}</p>
    </header>

    <section class="flex flex-col gap-4" aria-labelledby="recent-orders">
      <div class="flex items-baseline justify-between">
        <h2 id="recent-orders" class="type-h3">{{ $t('account.recentOrders') }}</h2>
        <NuxtLink :to="`/${cc}/account/orders`" class="link inline-flex min-h-11 items-center type-body-s md:min-h-0">{{ $t('account.allOrders') }}</NuxtLink>
      </div>
      <div v-if="status === 'pending'" class="grid gap-4 md:grid-cols-2"><UiSkeleton variant="block" class="h-[160px]" /><UiSkeleton variant="block" class="h-[160px]" /></div>
      <div v-else-if="orders.length" class="grid gap-4 md:grid-cols-2">
        <AccountOrderCard v-for="o in orders" :key="o.id" :order="o" />
      </div>
      <UiEmptyState v-else :title="$t('account.noOrdersTitle')" :body="$t('account.noOrdersBody')" compact>
        <template #icon><Package :size="26" aria-hidden="true" /></template>
        <UiButton :to="`/${cc}/shop`" variant="secondary">{{ $t('cart.browse') }}</UiButton>
      </UiEmptyState>
    </section>

    <div class="grid gap-6 md:grid-cols-2">
      <section class="rounded-xs border border-line bg-surface p-5" aria-labelledby="ov-profile">
        <h2 id="ov-profile" class="type-label">{{ $t('account.profile') }}</h2>
        <p class="mt-3 type-body-s text-ink-2">{{ customer.first_name }} {{ customer.last_name }}<br />{{ customer.email }}<br v-if="customer.phone" />{{ customer.phone }}</p>
        <UiButton variant="link" class="mt-3" :to="`/${cc}/account/profile`">{{ $t('account.editProfile') }}</UiButton>
      </section>
      <section class="rounded-xs border border-line bg-surface p-5" aria-labelledby="ov-address">
        <h2 id="ov-address" class="type-label">{{ $t('account.defaultAddress') }}</h2>
        <p v-if="address" class="mt-3 type-body-s text-ink-2">{{ address.first_name }} {{ address.last_name }}<br />{{ address.address_1 }}<br />{{ address.postal_code }} {{ address.city }}</p>
        <p v-else class="mt-3 type-body-s text-ink-3">{{ $t('account.noAddresses') }}</p>
        <UiButton variant="link" class="mt-3" :to="`/${cc}/account/addresses`">{{ $t('account.manageAddresses') }}</UiButton>
      </section>
    </div>
  </div>
</template>
