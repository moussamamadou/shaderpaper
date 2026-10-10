<script setup lang="ts">
/** An empty list, explained, with what to do next. */
withDefaults(defineProps<{ title: string; body?: string; compact?: boolean }>(), { body: '', compact: false })
</script>

<template>
  <div :class="['flex flex-col items-center text-center', compact ? 'gap-3 py-10' : 'gap-4 py-16 md:py-24']">
    <div v-if="$slots.icon" class="flex h-16 w-16 items-center justify-center rounded-pill bg-sunken text-ink-2">
      <slot name="icon" />
    </div>
    <h2 :class="compact ? 'type-h3' : 'type-h2'">{{ title }}</h2>
    <p v-if="body" class="max-w-prose type-body text-ink-2">{{ body }}</p>
    <div v-if="$slots.default" class="mt-2 flex flex-wrap justify-center gap-3">
      <slot />
    </div>
  </div>
</template>
