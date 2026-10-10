<script setup lang="ts">
/**
 * Order summary (cart page, checkout, order pages): subtotal, shipping,
 * taxes, discount, total. Shipping shows "Calculated at checkout" until a
 * method is chosen; nothing is invented.
 */
const props = withDefaults(
  defineProps<{
    totals: {
      currency_code: string
      item_subtotal?: number | null
      subtotal?: number | null
      shipping_subtotal?: number | null
      shipping_total?: number | null
      tax_total?: number | null
      discount_total?: number | null
      discount_subtotal?: number | null
      total?: number | null
    }
    hasShipping?: boolean
    title?: string
  }>(),
  { hasShipping: false, title: '' },
)
const { format } = useMoney()
const c = computed(() => props.totals.currency_code)
const discount = computed(() => props.totals.discount_subtotal ?? props.totals.discount_total ?? 0)
const itemSubtotal = computed(() => props.totals.item_subtotal ?? props.totals.subtotal ?? 0)
const shipping = computed(() => props.totals.shipping_subtotal ?? props.totals.shipping_total ?? 0)
</script>

<template>
  <section class="flex flex-col gap-3" :aria-label="title || $t('cart.summary')">
    <h2 v-if="title" class="type-h3">{{ title }}</h2>
    <dl class="flex flex-col gap-2 type-body-s">
      <div class="flex justify-between gap-4">
        <dt class="text-ink-2">{{ $t('cart.subtotal') }}</dt>
        <dd class="tabular-nums" data-testid="cart-subtotal">{{ format(itemSubtotal, c) }}</dd>
      </div>
      <div v-if="discount" class="flex justify-between gap-4">
        <dt class="text-ink-2">{{ $t('cart.discount') }}</dt>
        <dd class="tabular-nums text-success">−{{ format(discount, c) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-ink-2">{{ $t('cart.shipping') }}</dt>
        <dd class="tabular-nums">{{ hasShipping ? format(shipping, c) : $t('cart.calculatedAtCheckout') }}</dd>
      </div>
      <div v-if="hasShipping || totals.tax_total" class="flex justify-between gap-4">
        <dt class="text-ink-2">{{ $t('cart.taxes') }}</dt>
        <dd class="tabular-nums">{{ format(totals.tax_total ?? 0, c) }}</dd>
      </div>
    </dl>
    <div class="flex items-baseline justify-between gap-4 border-t border-line pt-3">
      <span class="type-body font-medium">{{ $t('cart.total') }}</span>
      <span class="type-price" data-testid="cart-total">{{ format(totals.total ?? 0, c) }}</span>
    </div>
  </section>
</template>
