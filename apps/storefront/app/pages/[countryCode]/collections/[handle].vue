<script setup lang="ts">
/**
 * A collection (one of the six categories): its header, the other
 * collections as chips, then the same browser as the shop with the
 * collection filter locked.
 */
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
const handle = computed(() => normalizeCategory(String(route.params.handle ?? '')) ?? '')
const { useCatalogCards } = useCatalog()
const { data: all, status, error } = await useCatalogCards()

const known = computed(() => CATEGORIES.some((c) => c.handle === handle.value) || all.value.some((c) => c.category?.handle === handle.value))
if (!known.value && !error.value) {
  throw createError({ statusCode: 404, statusMessage: t('errors.collectionNotFound'), fatal: true })
}
const cards = computed(() => all.value.filter((c) => c.category?.handle === handle.value))
const title = computed(() => t(`categories.${handle.value}`, categoryTitle(handle.value)))
const others = computed(() => CATEGORIES.filter((c) => c.handle !== handle.value))
useSeoMeta({ title: () => title.value, description: () => t(`collections.${handle.value}`) })
</script>

<template>
  <div class="page pb-24 pt-6 lg:pt-10">
    <UiBreadcrumbs :items="[{ label: $t('nav.shop'), to: '/shop' }, { label: title }]" />
    <header class="mt-4 flex flex-col gap-4 pb-8 lg:pb-10">
      <p class="eyebrow">{{ $t('collections.eyebrow') }}</p>
      <h1 class="type-display-l">{{ title }}</h1>
      <p class="max-w-prose type-body text-ink-2">{{ $t(`collections.${handle}`) }}</p>
      <nav :aria-label="$t('collections.others')" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-2 md:mx-0 md:flex-wrap md:px-0">
        <NuxtLink
          v-for="c in others"
          :key="c.handle"
          :to="`/${cc}/collections/${c.handle}`"
          class="inline-flex min-h-11 shrink-0 items-center rounded-pill border border-line bg-surface px-4 type-body-s text-ink hover:border-ink md:min-h-0 md:py-2"
        >
          {{ $t(`categories.${c.handle}`, c.title) }}
        </NuxtLink>
      </nav>
    </header>
    <UiBanner v-if="error" tone="danger" :title="$t('errors.catalogTitle')" class="mb-6">{{ $t('errors.catalogBody') }}</UiBanner>
    <ShopBrowser :cards="cards" :loading="status === 'pending' && !all.length" :locked-category="handle" />
  </div>
</template>
