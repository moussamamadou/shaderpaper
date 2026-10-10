<script setup lang="ts">
/** Loading placeholder: `line` (text), `card` (poster card), `pdp` (product page), `block` (any box). Hidden from screen readers. */
withDefaults(defineProps<{ variant?: 'line' | 'card' | 'pdp' | 'block'; lines?: number }>(), { variant: 'line', lines: 1 })
</script>

<template>
  <div v-if="variant === 'card'" class="flex flex-col gap-3" aria-hidden="true">
    <div class="skeleton aspect-thumb w-full" />
    <div class="skeleton h-4 w-2/3 rounded-xs" />
    <div class="skeleton h-3 w-1/3 rounded-xs" />
  </div>
  <div v-else-if="variant === 'pdp'" class="grid gap-8 lg:grid-cols-12 lg:gap-6" aria-hidden="true">
    <div class="skeleton aspect-poster w-full lg:col-span-7" />
    <div class="flex flex-col gap-4 lg:col-span-5">
      <div class="skeleton h-3 w-1/4 rounded-xs" />
      <div class="skeleton h-10 w-3/4 rounded-xs" />
      <div class="skeleton h-5 w-1/3 rounded-xs" />
      <div v-for="i in 4" :key="i" class="skeleton h-8 w-full rounded-xs" />
      <div class="skeleton h-12 w-full rounded-xs" />
    </div>
  </div>
  <div v-else-if="variant === 'block'" class="skeleton rounded-xs" aria-hidden="true" />
  <div v-else class="flex flex-col gap-2" aria-hidden="true">
    <div v-for="i in lines" :key="i" :class="['skeleton h-4 rounded-xs', i === lines && lines > 1 ? 'w-2/3' : 'w-full']" />
  </div>
</template>
