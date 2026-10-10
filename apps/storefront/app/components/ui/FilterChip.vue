<script setup lang="ts">
/** A toggle pill (aria-pressed) for filters; optional count. */
withDefaults(defineProps<{ pressed: boolean; count?: number | null }>(), { count: null })
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed"
    :class="[
      'inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 type-body-s transition-colors duration-fast md:min-h-0 md:py-2',
      pressed ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-ink',
    ]"
    @click="$emit('click')"
  >
    <slot />
    <span v-if="count != null" :class="['type-caption', pressed ? 'text-on-night-2' : 'text-ink-3']">{{ count }}</span>
  </button>
</template>
