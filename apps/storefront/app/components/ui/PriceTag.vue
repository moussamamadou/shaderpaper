<script setup lang="ts">
/** A price in the region's currency; "From" prefix for a range, strike-through original when discounted. */
const props = withDefaults(
  defineProps<{
    amount: number | null | undefined
    currency: string | null | undefined
    original?: number | null
    from?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { original: null, from: false, size: 'md' },
)
const { format } = useMoney()
const text = computed(() => format(props.amount, props.currency, { whole: true }))
const originalText = computed(() =>
  props.original != null && props.amount != null && props.original > props.amount ? format(props.original, props.currency, { whole: true }) : '',
)
</script>

<template>
  <span v-if="text" :class="['inline-flex items-baseline gap-2 tabular-nums', size === 'lg' ? 'type-h3' : size === 'sm' ? 'type-body-s font-medium' : 'type-price']">
    <span v-if="from" class="type-caption text-ink-3">{{ $t('product.from') }}</span>
    <span>{{ text }}</span>
    <s v-if="originalText" class="type-body-s text-ink-3"><span class="sr-only">{{ $t('product.originalPrice') }} </span>{{ originalText }}</s>
  </span>
  <span v-else class="type-body-s text-ink-3">{{ $t('product.priceUnavailable') }}</span>
</template>
