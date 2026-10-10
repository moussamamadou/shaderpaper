<script setup lang="ts">
import type { PosterCard } from '#shared/utils/catalog'

/**
 * Poster card: the plate on paper with the poster shadow; on hover (pointer
 * devices) the second variation fades in. Title, collection, "From" price,
 * and a "New" badge for the launch posters.
 */
const props = withDefaults(defineProps<{ card: PosterCard; compact?: boolean; eager?: boolean; headingLevel?: 'h2' | 'h3' }>(), {
  compact: false,
  eager: false,
  headingLevel: 'h3',
})
const cc = useCountryCode()
const second = computed(() => {
  const m = props.card.thumbnail?.match(/^(.*\/posters\/[a-z0-9_-]+)\.webp$/i)
  return m ? `${m[1]}-2.webp` : null
})
const { t } = useI18n()
const categoryName = computed(() => (props.card.category ? t(`categories.${props.card.category.handle}`, props.card.category.title) : ''))
</script>

<template>
  <article class="group relative flex flex-col" data-testid="product-card">
    <div class="relative aspect-thumb overflow-hidden bg-sunken shadow-poster transition-shadow duration-base group-hover:shadow-overlay">
      <img
        v-if="card.thumbnail"
        :src="card.thumbnail"
        alt=""
        width="600"
        height="750"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <img
        v-if="second"
        :src="second"
        alt=""
        width="600"
        height="750"
        loading="lazy"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-slow group-hover:opacity-100 reduced:hidden"
        @error="($event.target as HTMLImageElement).remove()"
      />
      <UiBadge v-if="card.isNew" tone="new" class="absolute left-3 top-3">{{ $t('common.new') }}</UiBadge>
    </div>
    <div :class="['flex items-start justify-between gap-3', compact ? 'mt-2' : 'mt-4']">
      <div class="min-w-0">
        <component :is="headingLevel" :class="[compact ? 'type-body-s' : 'type-body', 'font-medium text-ink']">
          <NuxtLink :to="`/${cc}/posters/${card.handle}`" class="after:absolute after:inset-0 focus-visible:shadow-none [&:focus-visible]:after:shadow-focus">
            {{ card.title }}
          </NuxtLink>
        </component>
        <p v-if="categoryName && !compact" class="mt-1 type-caption text-ink-3">{{ categoryName }}</p>
      </div>
      <UiPriceTag :amount="card.price?.amount" :currency="card.price?.currency" from :size="compact ? 'sm' : 'md'" class="shrink-0" />
    </div>
  </article>
</template>
