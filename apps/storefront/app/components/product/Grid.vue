<script setup lang="ts">
import type { PosterCard } from '#shared/utils/catalog'

/**
 * Poster grid. Comfortable: 2 / 3 / 4 columns; compact: 3 / 4 / 6. Shows
 * skeleton cards while loading. headingLevel: h2 when the grid sits right
 * under the page's h1 (shop, collections, search), h3 under a section h2.
 */
withDefaults(defineProps<{ cards: PosterCard[]; density?: 'comfortable' | 'compact'; loading?: boolean; skeletons?: number; headingLevel?: 'h2' | 'h3' }>(), {
  density: 'comfortable',
  headingLevel: 'h3',
  loading: false,
  skeletons: 8,
})
</script>

<template>
  <ul
    :class="[
      'grid',
      density === 'compact'
        ? 'grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-5 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-8'
        : 'grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12',
    ]"
    :aria-busy="loading || undefined"
    data-testid="product-grid"
  >
    <template v-if="loading">
      <li v-for="i in skeletons" :key="`s${i}`"><UiSkeleton variant="card" /></li>
    </template>
    <li v-for="(card, i) in cards" v-else :key="card.id">
      <ProductCard :card="card" :compact="density === 'compact'" :eager="i < 4" :heading-level="headingLevel" />
    </li>
  </ul>
</template>
