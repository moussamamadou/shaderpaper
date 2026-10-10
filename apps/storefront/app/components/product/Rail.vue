<script setup lang="ts">
import type { PosterCard } from '#shared/utils/catalog'

/**
 * A titled row of posters. Mobile: a horizontal scroller with snap (cards at
 * 70 % of the width, so the next one peeks). Desktop: a four-column grid.
 */
withDefaults(defineProps<{ title: string; cards: PosterCard[]; eyebrow?: string; moreTo?: string; moreLabel?: string; loading?: boolean }>(), {
  eyebrow: '',
  moreTo: '',
  moreLabel: '',
  loading: false,
})
const cc = useCountryCode()
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="page flex items-end justify-between gap-4">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 class="mt-2 type-h2">{{ title }}</h2>
      </div>
      <NuxtLink v-if="moreTo" :to="`/${cc}${moreTo}`" class="link inline-flex min-h-11 shrink-0 items-center type-body-s md:min-h-0">{{ moreLabel }}</NuxtLink>
    </div>
    <ul class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:px-8 lg:mx-auto lg:grid lg:w-full lg:max-w-content lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-12">
      <template v-if="loading">
        <li v-for="i in 4" :key="i" class="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-auto"><UiSkeleton variant="card" /></li>
      </template>
      <li v-for="card in cards" v-else :key="card.id" class="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
        <ProductCard :card="card" />
      </li>
    </ul>
  </section>
</template>
