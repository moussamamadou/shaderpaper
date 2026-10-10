<script setup lang="ts">
/** Small mono-caps tag. `new` is the one place the signal colour appears on a card. */
withDefaults(defineProps<{ tone?: 'new' | 'info' | 'success' | 'warning' | 'danger' | 'neutral' }>(), { tone: 'neutral' })
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 type-caption',
      {
        new: 'bg-signal text-on-signal',
        info: 'bg-info-bg text-info',
        success: 'bg-success-bg text-success',
        warning: 'bg-warning-bg text-warning',
        danger: 'bg-danger-bg text-danger',
        neutral: 'bg-sunken text-ink-2',
      }[tone],
    ]"
  >
    <slot />
  </span>
</template>
