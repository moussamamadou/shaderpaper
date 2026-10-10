<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next'

/**
 * The cart drawer: opens from the header and after an add-to-cart. Lines can
 * be changed here; every change is read out through the drawer's live region.
 */
const { isOpen, announce, added } = useCartDrawer()
const { cart } = useCart()
const cc = useCountryCode()
const { t } = useI18n()
const items = computed(() => (cart.value?.items ?? []).slice().sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))))
const count = computed(() => items.value.reduce((n, i) => n + (i.quantity ?? 0), 0))
const { format } = useMoney()
watch(isOpen, (open) => {
  if (!open) {
    announce.value = ''
    added.value = ''
  }
})
</script>

<template>
  <UiDrawer v-model:open="isOpen" :title="t('cart.drawerTitle', { n: count })" :description="count ? t('cart.madeToOrderNote') : ''">
    <p class="sr-only" aria-live="polite" role="status">{{ announce }}</p>
    <div v-if="added" class="px-4 pt-4 md:px-6" data-testid="drawer-added">
      <UiBanner tone="success" :title="$t('cart.addedTitle')">{{ added }}</UiBanner>
    </div>
    <div v-if="items.length" class="px-4 md:px-6">
      <ul class="divide-y divide-line" data-testid="drawer-lines">
        <CartLine v-for="item in items" :key="item.id" :item="item" :currency="cart!.currency_code" compact @changed="(m) => (announce = m)" />
      </ul>
    </div>
    <UiEmptyState v-else :title="$t('cart.emptyTitle')" :body="$t('cart.emptyBody')" compact class="px-6">
      <template #icon><ShoppingBag :size="28" aria-hidden="true" /></template>
      <UiButton :to="`/${cc}/shop`" @click="isOpen = false">{{ $t('cart.browse') }}</UiButton>
    </UiEmptyState>
    <template v-if="items.length && cart" #footer>
      <div class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between">
          <span class="type-body font-medium">{{ $t('cart.subtotal') }}</span>
          <span class="type-price" data-testid="drawer-subtotal">{{ format(cart.item_subtotal ?? cart.subtotal ?? 0, cart.currency_code) }}</span>
        </div>
        <p class="type-caption text-ink-3">{{ $t('cart.shippingAtCheckout') }}</p>
        <UiButton :to="`/${cc}/checkout?step=address`" block size="lg" @click="isOpen = false">{{ $t('cart.checkout') }}</UiButton>
        <UiButton :to="`/${cc}/cart`" variant="secondary" block @click="isOpen = false">{{ $t('cart.viewCart') }}</UiButton>
      </div>
    </template>
  </UiDrawer>
</template>
