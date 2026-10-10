<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next'

/**
 * The cart page: every line with its design, quantity and remove; the
 * summary with shipping "calculated at checkout"; the way to checkout. The
 * cart and customer are refetched on every visit (MapAndSky's cart page did
 * the same), and every change is announced through a polite live region.
 */
const { cart, retrieveCart } = useCart()
const { customer, retrieveCustomer } = useCustomer()
const cc = useCountryCode()
const { t } = useI18n()
useSeoMeta({ title: () => t('cart.title'), robots: 'noindex' })

const { status } = useAsyncData('cart-page', async () => {
  const [c, u] = await Promise.all([retrieveCart(), retrieveCustomer()])
  return { cart: c, customer: u }
})
const items = computed(() => (cart.value?.items ?? []).slice().sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))))
const count = computed(() => items.value.reduce((n, i) => n + (i.quantity ?? 0), 0))
const announce = ref('')
</script>

<template>
  <div class="page pb-24 pt-6 lg:pt-10">
    <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
    <h1 class="type-h1">{{ $t('cart.title') }}<span v-if="count" class="ml-3 type-body text-ink-3">{{ $t('cart.itemCount', { n: count }, count) }}</span></h1>

    <div v-if="status === 'pending' && !cart" class="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-6" aria-busy="true">
      <div class="flex flex-col gap-6 lg:col-span-8">
        <div v-for="i in 2" :key="i" class="flex gap-4">
          <UiSkeleton variant="block" class="h-[140px] w-[112px]" />
          <div class="flex-1"><UiSkeleton :lines="3" /></div>
        </div>
      </div>
      <UiSkeleton variant="block" class="h-[224px] lg:col-span-4" />
    </div>

    <div v-else-if="items.length && cart" class="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-6">
      <ul class="divide-y divide-line border-y border-line lg:col-span-8" data-testid="cart-lines">
        <CartLine v-for="item in items" :key="item.id" :item="item" :currency="cart.currency_code" @changed="(m) => (announce = m)" />
      </ul>
      <aside class="lg:col-span-4">
        <div class="flex flex-col gap-5 rounded-xs border border-line bg-surface p-5 lg:sticky lg:top-[88px] lg:p-6">
          <CartSummary :totals="cart" :has-shipping="!!cart.shipping_methods?.length" :title="$t('cart.summary')" />
          <UiButton :to="`/${cc}/checkout?step=address`" size="lg" block data-testid="checkout-button">{{ $t('cart.checkout') }}</UiButton>
          <p class="type-caption text-ink-3">{{ $t('cart.madeToOrderNote') }}</p>
          <p v-if="!customer" class="border-t border-line pt-4 type-body-s text-ink-2">
            {{ $t('cart.signInPrompt') }}
            <NuxtLink :to="`/${cc}/account`" class="link">{{ $t('cart.signIn') }}</NuxtLink>
          </p>
        </div>
      </aside>
    </div>

    <UiEmptyState v-else :title="$t('cart.emptyTitle')" :body="$t('cart.emptyBody')" data-testid="cart-empty">
      <template #icon><ShoppingBag :size="28" aria-hidden="true" /></template>
      <UiButton :to="`/${cc}/shop`">{{ $t('cart.browse') }}</UiButton>
    </UiEmptyState>
  </div>
</template>
