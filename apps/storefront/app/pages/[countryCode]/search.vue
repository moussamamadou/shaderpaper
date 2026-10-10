<script setup lang="ts">
import { Search, SearchX } from 'lucide-vue-next'

/**
 * Search over Medusa's store product search (`q`): results, no results (with
 * the collections to browse instead) and the empty query (a prompt and the
 * collections). The query lives in the URL (?q=).
 */
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
const { search } = useCatalog()
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim().slice(0, 100) : ''))
const input = ref(q.value)
watch(q, (v) => (input.value = v))

const { data: results, status, error } = await useAsyncData(
  () => `search-${cc.value}-${q.value}`,
  () => (q.value ? search(q.value) : Promise.resolve([])),
  { default: () => [], watch: [q] },
)
const submit = () => navigateTo({ path: route.path, query: input.value.trim() ? { q: input.value.trim() } : {} })
useSeoMeta({ title: () => (q.value ? t('search.titleFor', { q: q.value }) : t('search.title')), robots: 'noindex' })
</script>

<template>
  <div class="page pb-24 pt-6 lg:pt-10">
    <h1 class="sr-only">{{ $t('search.title') }}</h1>
    <form role="search" class="mx-auto flex max-w-[720px] items-end gap-2" @submit.prevent="submit">
      <div class="flex-1">
        <UiTextField v-model="input" :label="$t('search.label')" name="q" type="search" autocomplete="off" enterkeyhint="search" data-testid="search-input" />
      </div>
      <UiButton type="submit" data-testid="search-submit"><Search :size="16" aria-hidden="true" />{{ $t('search.submit') }}</UiButton>
    </form>

    <div class="mt-10" aria-live="polite">
      <template v-if="!q">
        <UiEmptyState :title="$t('search.emptyTitle')" :body="$t('search.emptyBody')" compact>
          <template #icon><Search :size="26" aria-hidden="true" /></template>
        </UiEmptyState>
      </template>
      <template v-else-if="status === 'pending'">
        <p class="mb-6 type-body-s text-ink-2">{{ $t('search.searching', { q }) }}</p>
        <ProductGrid :cards="[]" loading :skeletons="4" />
      </template>
      <template v-else-if="error">
        <UiBanner tone="danger" :title="$t('errors.searchTitle')" live>{{ $t('errors.searchBody') }}</UiBanner>
      </template>
      <template v-else-if="results.length">
        <p class="mb-6 type-body-s text-ink-2" data-testid="search-count">{{ $t('search.resultsFor', { n: results.length, q }, results.length) }}</p>
        <ProductGrid :cards="results" />
      </template>
      <template v-else>
        <UiEmptyState :title="$t('search.noResultsTitle', { q })" :body="$t('search.noResultsBody')" compact data-testid="search-empty">
          <template #icon><SearchX :size="26" aria-hidden="true" /></template>
        </UiEmptyState>
      </template>
    </div>

    <nav v-if="!q || (!results.length && status !== 'pending')" class="mx-auto mt-4 max-w-[720px]" :aria-label="$t('search.browse')">
      <p class="eyebrow mb-3 text-center">{{ $t('search.browse') }}</p>
      <ul class="flex flex-wrap justify-center gap-2">
        <li v-for="c in CATEGORIES" :key="c.handle">
          <NuxtLink :to="`/${cc}/collections/${c.handle}`" class="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-4 type-body-s hover:border-ink md:min-h-0 md:py-2">
            {{ $t(`categories.${c.handle}`, c.title) }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
