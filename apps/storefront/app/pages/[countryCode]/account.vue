<script setup lang="ts">
/**
 * The account shell (MapAndSky's account layout): guests get sign in /
 * create account on every /account URL; customers get the navigation and
 * the child page. The children are only mounted with a customer, so they
 * never run for a guest.
 */
const { customer, useCustomerData } = useCustomer()
const { status } = useCustomerData()
const { t } = useI18n()
useSeoMeta({ title: () => (customer.value ? undefined : t('account.signIn')), robots: 'noindex' })
</script>

<template>
  <div class="page pb-24 pt-8 lg:pt-12">
    <div v-if="status === 'pending' && !customer" class="flex justify-center py-24" role="status">
      <UiSpinner :size="28" /><span class="sr-only">{{ $t('common.loading') }}</span>
    </div>
    <AccountAuth v-else-if="!customer" />
    <div v-else class="grid gap-8 lg:grid-cols-12 lg:gap-6">
      <aside class="lg:col-span-3">
        <p class="eyebrow mb-3 hidden lg:block">{{ $t('account.title') }}</p>
        <AccountNav />
      </aside>
      <div class="min-w-0 lg:col-span-9">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
