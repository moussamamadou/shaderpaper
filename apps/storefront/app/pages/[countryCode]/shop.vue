<script setup lang="ts">
/** All posters: filters, sort, density and pages (see <ShopBrowser>). */
const { t } = useI18n()
const { useCatalogCards } = useCatalog()
const { data: cards, status, error } = await useCatalogCards()
useSeoMeta({ title: () => t('shop.title'), description: () => t('shop.description') })
</script>

<template>
  <div class="page pb-24 pt-6 lg:pt-10">
    <UiBreadcrumbs :items="[{ label: $t('nav.home'), to: '/' }, { label: $t('shop.title') }]" />
    <header class="mt-4 flex flex-col gap-3 pb-8 lg:pb-10">
      <h1 class="type-display-l">{{ $t('shop.title') }}</h1>
      <p class="max-w-prose type-body text-ink-2">{{ $t('shop.intro') }}</p>
    </header>
    <UiBanner v-if="error" tone="danger" :title="$t('errors.catalogTitle')" class="mb-6">{{ $t('errors.catalogBody') }}</UiBanner>
    <ShopBrowser :cards="cards" :loading="status === 'pending' && !cards.length" />
  </div>
</template>
