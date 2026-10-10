<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

/** − n + with labelled buttons; the value is announced politely when it changes. */
const props = withDefaults(
  defineProps<{ modelValue: number; min?: number; max?: number; disabled?: boolean; label?: string; size?: 'sm' | 'md' }>(),
  { min: 1, max: 10, disabled: false, label: '', size: 'md' },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const set = (v: number) => {
  const n = Math.max(props.min, Math.min(props.max, v))
  if (n !== props.modelValue) emit('update:modelValue', n)
}
const btn = computed(() =>
  [
    'flex items-center justify-center text-ink transition-colors duration-fast hover:bg-sunken disabled:pointer-events-none disabled:opacity-30',
    props.size === 'sm' ? 'h-11 w-11 md:h-8 md:w-8' : 'h-11 w-11',
  ].join(' '),
)
</script>

<template>
  <div
    role="group"
    :aria-label="label || $t('cart.quantity')"
    :class="['inline-flex items-center rounded-xs border border-ink-3 bg-surface', disabled ? 'opacity-60' : '']"
  >
    <button type="button" :class="btn" :disabled="disabled || modelValue <= min" :aria-label="$t('cart.decrease')" @click="set(modelValue - 1)">
      <Minus :size="16" aria-hidden="true" />
    </button>
    <output class="min-w-8 text-center type-body font-medium tabular-nums" aria-live="polite">{{ modelValue }}</output>
    <button type="button" :class="btn" :disabled="disabled || modelValue >= max" :aria-label="$t('cart.increase')" @click="set(modelValue + 1)">
      <Plus :size="16" aria-hidden="true" />
    </button>
  </div>
</template>
