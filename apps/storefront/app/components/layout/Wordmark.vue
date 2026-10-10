<script setup lang="ts">
/** The ShaderPaper wordmark: a small 3:4 sheet with a gradient field, then the name. */
withDefaults(defineProps<{ tone?: 'ink' | 'night' }>(), { tone: 'ink' })
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true" class="shrink-0">
      <defs>
        <linearGradient id="sp-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F0441A" />
          <stop offset="0.55" stop-color="#2450B2" />
          <stop offset="1" stop-color="#111111" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="17" height="23" :fill="tone === 'night' ? '#F5F3EF' : '#111111'" />
      <circle cx="9" cy="12" r="6.2" fill="url(#sp-mark)" />
    </svg>
    <span :class="['type-h3 font-semibold tracking-[-0.02em]', tone === 'night' ? 'text-on-night' : 'text-ink']">ShaderPaper</span>
  </span>
</template>
