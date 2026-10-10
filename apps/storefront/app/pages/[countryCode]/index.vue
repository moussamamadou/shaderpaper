<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

/**
 * Home: hero poster, the six collections, the new 3D posters, how the
 * customiser works and how a poster is made. Every poster image is a
 * catalogue plate; what the business has not decided (paper, lab, delivery
 * time) is marked "to be written".
 */
const cc = useCountryCode()
const { t } = useI18n()
const { useCatalogCards } = useCatalog()
const { data: cards, status, error } = await useCatalogCards()

const featured = computed(
  () => cards.value.find((c) => c.handle === 'glass') ?? cards.value.find((c) => c.isNew) ?? cards.value[0] ?? null,
)
const second = computed(() => cards.value.find((c) => c.handle === 'julia') ?? cards.value.find((c) => c !== featured.value && !c.isNew) ?? null)
const newCards = computed(() => cards.value.filter((c) => c.isNew).slice(0, 8))
const collections = computed(() =>
  CATEGORIES.map((cat) => {
    const list = cards.value.filter((c) => c.category?.handle === cat.handle)
    return { ...cat, count: list.length, image: list[0]?.thumbnail ?? null }
  }),
)
const fromPrice = computed(() => {
  const priced = cards.value.filter((c) => c.price)
  if (!priced.length) return null
  return priced.reduce((a, b) => (b.price!.amount < a.price!.amount ? b : a)).price
})
const { format } = useMoney()

useSeoMeta({ title: '', description: () => t('home.description'), ogTitle: 'ShaderPaper', ogDescription: () => t('home.description') })
const steps = computed(() => [1, 2, 3, 4].map((n) => ({ n, title: t(`home.step${n}Title`), body: t(`home.step${n}Body`) })))
</script>

<template>
  <div class="flex flex-col gap-20 pb-24 lg:gap-32">
    <!-- Hero -->
    <section class="page grid items-center gap-10 pt-8 lg:grid-cols-12 lg:gap-6 lg:pt-12">
      <div class="flex flex-col gap-6 lg:col-span-5">
        <p class="eyebrow">{{ $t('home.eyebrow') }}</p>
        <h1 class="type-display-xl">{{ $t('home.headline') }}</h1>
        <p class="max-w-prose type-body-l text-ink-2">{{ $t('home.lede') }}</p>
        <div class="flex flex-wrap gap-3">
          <UiButton :to="`/${cc}/shop`" size="lg" data-testid="hero-shop">{{ $t('home.ctaShop') }}</UiButton>
          <UiButton v-if="featured" :to="`/${cc}/posters/${featured.handle}`" variant="secondary" size="lg">
            {{ $t('home.ctaCustomise', { title: featured.title }) }}
          </UiButton>
        </div>
        <p v-if="fromPrice" class="type-caption text-ink-3">
          {{ $t('home.fromPrice', { price: format(fromPrice.amount, fromPrice.currency, { whole: true }) }) }}
        </p>
      </div>
      <div class="relative lg:col-span-7">
        <div v-if="featured" class="grid grid-cols-5 items-end gap-3 lg:gap-6">
          <NuxtLink :to="`/${cc}/posters/${featured.handle}`" class="col-span-3" :aria-label="featured.title">
            <PosterMockup frame="oak" :scale="0.92">
              <img :src="featured.thumbnail ?? ''" alt="" width="600" height="800" class="absolute inset-0 h-full w-full object-cover" fetchpriority="high" />
            </PosterMockup>
          </NuxtLink>
          <NuxtLink v-if="second" :to="`/${cc}/posters/${second.handle}`" class="col-span-2" :aria-label="second.title">
            <PosterMockup frame="black" :scale="0.86">
              <img :src="second.thumbnail ?? ''" alt="" width="600" height="800" class="absolute inset-0 h-full w-full object-cover" />
            </PosterMockup>
          </NuxtLink>
        </div>
        <UiSkeleton v-else-if="status === 'pending'" variant="block" class="aspect-[5/4] w-full" />
      </div>
    </section>

    <UiBanner v-if="error" tone="danger" :title="$t('errors.catalogTitle')" class="page">{{ $t('errors.catalogBody') }}</UiBanner>

    <!-- Collections -->
    <section class="page flex flex-col gap-8" aria-labelledby="home-collections">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="eyebrow">{{ $t('home.collectionsEyebrow') }}</p>
          <h2 id="home-collections" class="mt-2 type-h2">{{ $t('home.collectionsTitle') }}</h2>
        </div>
        <NuxtLink :to="`/${cc}/shop`" class="link inline-flex min-h-11 shrink-0 items-center type-body-s md:min-h-0">{{ $t('home.viewAll') }}</NuxtLink>
      </div>
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-6">
        <li v-for="c in collections" :key="c.handle">
          <NuxtLink :to="`/${cc}/collections/${c.handle}`" class="group flex flex-col gap-3" data-testid="collection-tile">
            <div class="relative aspect-[4/3] overflow-hidden bg-sunken">
              <img v-if="c.image" :src="c.image" alt="" width="600" height="800" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03] reduced:transition-none" />
            </div>
            <div class="flex items-baseline justify-between gap-2">
              <span class="type-body font-medium group-hover:underline group-hover:underline-offset-4">{{ $t(`categories.${c.handle}`, c.title) }}</span>
              <span class="type-caption tabular-nums text-ink-3">{{ $t('home.posterCount', { n: c.count }, c.count) }}</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- New: 3D & material -->
    <ProductRail
      v-if="newCards.length || status === 'pending'"
      :eyebrow="$t('home.newEyebrow')"
      :title="$t('home.newTitle')"
      :cards="newCards"
      :loading="status === 'pending' && !cards.length"
      more-to="/campaigns/material"
      :more-label="$t('home.newMore')"
    />

    <!-- How customising works -->
    <section class="bg-surface py-16 lg:py-24" aria-labelledby="home-how">
      <div class="page grid gap-10 lg:grid-cols-12 lg:gap-6">
        <div class="flex flex-col gap-4 lg:col-span-4">
          <p class="eyebrow">{{ $t('home.howEyebrow') }}</p>
          <h2 id="home-how" class="type-h2">{{ $t('home.howTitle') }}</h2>
          <p class="type-body text-ink-2">{{ $t('home.howBody') }}</p>
        </div>
        <ol class="grid gap-8 sm:grid-cols-2 lg:col-span-8 lg:gap-x-6 lg:gap-y-10">
          <li v-for="s in steps" :key="s.n" class="flex flex-col gap-2 border-t border-line pt-4">
            <span class="type-label text-ink-3">{{ String(s.n).padStart(2, '0') }}</span>
            <h3 class="type-h3">{{ s.title }}</h3>
            <p class="type-body-s text-ink-2">{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- How it's made -->
    <section class="page grid gap-10 lg:grid-cols-12 lg:gap-6" aria-labelledby="home-print">
      <div class="flex flex-col gap-4 lg:col-span-5">
        <p class="eyebrow">{{ $t('home.printEyebrow') }}</p>
        <h2 id="home-print" class="type-h2">{{ $t('home.printTitle') }}</h2>
        <p class="type-body text-ink-2">{{ $t('home.printBody') }}</p>
        <NuxtLink :to="`/${cc}/about`" class="link inline-flex min-h-11 items-center gap-1 self-start type-body-s md:min-h-0">
          {{ $t('home.printMore') }} <ArrowRight :size="16" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div class="flex flex-col gap-4 lg:col-span-6 lg:col-start-7">
        <InfoTbw :what="$t('home.tbwPrint')" />
      </div>
    </section>
  </div>
</template>
