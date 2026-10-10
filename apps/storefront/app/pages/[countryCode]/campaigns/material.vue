<script setup lang="ts">
/**
 * Campaign landing for the "3D & material" collection: the seven new 3D
 * posters (LAUNCH_IDS, or what the backend marks new in that collection).
 * Night hero band, the posters, how the 3D ones differ, then the way into
 * the collection.
 */
const cc = useCountryCode()
const { t } = useI18n()
const { useCatalogCards } = useCatalog()
const { data: cards, status, error } = await useCatalogCards()

const launch = computed(() => {
  const ids = LAUNCH_IDS as readonly string[]
  const byId = cards.value.filter((c) => ids.includes(c.handle))
  const list = byId.length ? byId : cards.value.filter((c) => c.isNew && c.category?.handle === 'material')
  return list.slice().sort((a, b) => ids.indexOf(a.handle) - ids.indexOf(b.handle))
})
const hero = computed(() => launch.value.slice(0, 3))
const materialCount = computed(() => cards.value.filter((c) => c.category?.handle === 'material').length)

useSeoMeta({ title: () => t('campaign.title'), description: () => t('campaign.description') })
</script>

<template>
  <div class="flex flex-col gap-16 pb-24 lg:gap-24">
    <section class="bg-night text-on-night" aria-labelledby="campaign-title">
      <div class="page grid items-center gap-10 py-12 lg:grid-cols-12 lg:gap-6 lg:py-20">
        <div class="flex flex-col gap-6 lg:col-span-5">
          <p class="type-label text-on-night-2">
            <span class="mr-2 inline-flex rounded-pill bg-signal px-2 py-0.5 text-on-signal">{{ $t('product.new') }}</span>{{ $t('campaign.eyebrow') }}
          </p>
          <h1 id="campaign-title" class="type-display-xl">{{ $t('campaign.headline') }}</h1>
          <p class="max-w-prose type-body-l text-on-night-2">{{ $t('campaign.lede', { n: launch.length || 7 }) }}</p>
          <div class="flex flex-wrap gap-3">
            <UiButton variant="night" size="lg" :to="`/${cc}/collections/material`">{{ $t('campaign.ctaCollection') }}</UiButton>
            <UiButton v-if="launch[0]" variant="secondary" size="lg" class="border-on-night text-on-night hover:bg-on-night hover:text-night" :to="`/${cc}/posters/${launch[0].handle}`">
              {{ $t('home.ctaCustomise', { title: launch[0].title }) }}
            </UiButton>
          </div>
        </div>
        <div class="grid grid-cols-3 items-end gap-3 lg:col-span-7 lg:gap-5">
          <NuxtLink
            v-for="(c, i) in hero"
            :key="c.id"
            :to="`/${cc}/posters/${c.handle}`"
            :aria-label="c.title"
            :class="['block', i === 1 ? 'lg:-translate-y-8' : '']"
          >
            <div class="relative aspect-thumb overflow-hidden shadow-overlay">
              <img :src="c.thumbnail ?? ''" alt="" width="600" height="800" :fetchpriority="i === 0 ? 'high' : undefined" class="absolute inset-0 h-full w-full object-cover" />
            </div>
          </NuxtLink>
          <template v-if="!hero.length && status === 'pending'">
            <div v-for="i in 3" :key="i" class="aspect-thumb bg-night-2" />
          </template>
        </div>
      </div>
    </section>

    <UiBanner v-if="error" tone="danger" :title="$t('errors.catalogTitle')" class="page">{{ $t('errors.catalogBody') }}</UiBanner>

    <section class="page flex flex-col gap-8" aria-labelledby="campaign-posters">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="eyebrow">{{ $t('campaign.postersEyebrow') }}</p>
          <h2 id="campaign-posters" class="mt-2 type-h2">{{ $t('campaign.postersTitle', { n: launch.length }, launch.length) }}</h2>
        </div>
      </div>
      <ProductGrid :cards="launch" :loading="status === 'pending' && !cards.length" :skeletons="7" />
    </section>

    <section class="page grid gap-10 lg:grid-cols-12 lg:gap-6" aria-labelledby="campaign-why">
      <div class="flex flex-col gap-4 lg:col-span-5">
        <p class="eyebrow">{{ $t('campaign.whyEyebrow') }}</p>
        <h2 id="campaign-why" class="type-h2">{{ $t('campaign.whyTitle') }}</h2>
      </div>
      <div class="flex flex-col gap-4 type-body text-ink-2 lg:col-span-6 lg:col-start-7">
        <p>{{ $t('campaign.why1') }}</p>
        <p>{{ $t('campaign.why2') }}</p>
        <UiButton variant="secondary" class="self-start" :to="`/${cc}/collections/material`">
          {{ $t('campaign.ctaAll', { n: materialCount }, materialCount) }}
        </UiButton>
      </div>
    </section>
  </div>
</template>
