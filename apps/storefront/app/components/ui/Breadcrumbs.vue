<script setup lang="ts">
/** Breadcrumb trail; the last item is the current page. `to` paths are country-relative ("/shop"). */
defineProps<{ items: { label: string; to?: string }[] }>()
const cc = useCountryCode()
</script>

<template>
  <nav :aria-label="$t('common.breadcrumb')">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 type-caption text-ink-3">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <NuxtLink
          v-if="item.to && i < items.length - 1"
          :to="item.to === '/' ? `/${cc}` : `/${cc}${item.to}`"
          class="inline-flex min-h-11 items-center hover:text-ink md:min-h-0"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else aria-current="page" class="text-ink-2">{{ item.label }}</span>
        <span v-if="i < items.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
