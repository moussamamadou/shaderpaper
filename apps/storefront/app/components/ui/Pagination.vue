<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/** Page links that keep the rest of the query (filters, sort). */
const props = defineProps<{ page: number; pages: number }>()
const route = useRoute()
const to = (p: number) => ({ path: route.path, query: { ...route.query, page: p > 1 ? String(p) : undefined } })
const list = computed(() => {
  const out: (number | '…')[] = []
  for (let p = 1; p <= props.pages; p++) {
    if (p === 1 || p === props.pages || Math.abs(p - props.page) <= 1) out.push(p)
    else if (out[out.length - 1] !== '…') out.push('…')
  }
  return out
})
const cell = 'flex h-11 min-w-11 items-center justify-center rounded-xs px-2 type-body-s transition-colors duration-fast md:h-10 md:min-w-10'
</script>

<template>
  <nav v-if="pages > 1" :aria-label="$t('common.pagination')" class="flex items-center justify-center gap-1">
    <NuxtLink v-if="page > 1" :to="to(page - 1)" :class="[cell, 'hover:bg-sunken']" :aria-label="$t('common.previousPage')">
      <ChevronLeft :size="18" aria-hidden="true" />
    </NuxtLink>
    <span v-else :class="[cell, 'text-line-strong']" aria-hidden="true"><ChevronLeft :size="18" /></span>
    <template v-for="(p, i) in list" :key="i">
      <span v-if="p === '…'" :class="[cell, 'text-ink-3']" aria-hidden="true">…</span>
      <NuxtLink
        v-else
        :to="to(p)"
        :aria-current="p === page ? 'page' : undefined"
        :aria-label="$t('common.pageN', { n: p })"
        :class="[cell, p === page ? 'bg-ink text-paper' : 'hover:bg-sunken']"
      >
        {{ p }}
      </NuxtLink>
    </template>
    <NuxtLink v-if="page < pages" :to="to(page + 1)" :class="[cell, 'hover:bg-sunken']" :aria-label="$t('common.nextPage')">
      <ChevronRight :size="18" aria-hidden="true" />
    </NuxtLink>
    <span v-else :class="[cell, 'text-line-strong']" aria-hidden="true"><ChevronRight :size="18" /></span>
  </nav>
</template>
