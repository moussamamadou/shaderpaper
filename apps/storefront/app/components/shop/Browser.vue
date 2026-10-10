<script setup lang="ts">
import { Grid2x2, Grid3x3, SlidersHorizontal, X } from 'lucide-vue-next'
import type { PosterCard, ShopQuery, SortKey } from '#shared/utils/catalog'

/**
 * A browsable poster list: filters (sidebar on desktop, a drawer on mobile),
 * sort, grid density and pages, all kept in the URL query
 * (?category=&min=&max=&sort=&grid=compact&page=) so a filtered view can be
 * shared and survives a reload. Filtering happens on the page over the
 * region's whole catalogue (54 posters), with the pure helpers in
 * shared/utils/catalog.ts. `lockedCategory` (collection pages) hides the
 * collection filter.
 */
const props = withDefaults(defineProps<{ cards: PosterCard[]; loading?: boolean; lockedCategory?: string | null; perPage?: number }>(), {
  loading: false,
  lockedCategory: null,
  perPage: 24,
})
const route = useRoute()
const { t } = useI18n()
const { format } = useMoney()

const state = computed(() => parseShopQuery(route.query as Record<string, string>))
const facets = computed(() => facetsOf(props.cards))
const filtered = computed(() =>
  filterCards(props.cards, { ...state.value, categories: props.lockedCategory ? [] : state.value.categories }),
)
const sorted = computed(() => sortCards(filtered.value, state.value.sort))
const paged = computed(() => paginate(sorted.value, state.value.page, props.perPage))

const update = (patch: Partial<ShopQuery>) =>
  navigateTo({ path: route.path, query: shopQueryToRoute({ ...state.value, page: 1, ...patch }) }, { replace: true })

const sortOptions = computed(() =>
  (['featured', 'newest', 'price-asc', 'price-desc', 'az'] as SortKey[]).map((v) => ({ value: v, label: t(`shop.sort.${v}`) })),
)
const sortModel = computed({
  get: () => state.value.sort,
  set: (v: string) => update({ sort: v as SortKey }),
})

const active = computed(() => {
  const out: { key: string; label: string; clear: Partial<ShopQuery> }[] = []
  if (!props.lockedCategory) {
    for (const c of state.value.categories) {
      out.push({
        key: `c-${c}`,
        label: t(`categories.${c}`, categoryTitle(c)),
        clear: { categories: state.value.categories.filter((x) => x !== c) },
      })
    }
  }
  if (state.value.min != null || state.value.max != null) {
    const cur = facets.value.price?.currency ?? ''
    const lo = state.value.min != null ? format(state.value.min, cur, { whole: true }) || String(state.value.min) : '…'
    const hi = state.value.max != null ? format(state.value.max, cur, { whole: true }) || String(state.value.max) : '…'
    out.push({ key: 'price', label: t('shop.priceChip', { lo, hi }), clear: { min: null, max: null } })
  }
  return out
})
const clearAll = () => update({ categories: [], min: null, max: null })

const filtersOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-x-6">
    <!-- Desktop sidebar -->
    <aside class="hidden lg:col-span-3 lg:block" :aria-label="$t('shop.filters')">
      <div class="sticky top-[88px]">
        <ShopFilters :state="state" :facets="facets" :show-categories="!lockedCategory" id-prefix="side" @change="update" />
      </div>
    </aside>

    <div class="flex flex-col gap-6 lg:col-span-9">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <p class="type-body-s text-ink-2" role="status" aria-live="polite" data-testid="result-count">
          {{ loading ? $t('shop.loading') : $t('shop.count', { n: filtered.length }, filtered.length) }}
        </p>
        <div class="flex items-end gap-2">
          <UiButton variant="secondary" size="sm" class="lg:hidden" data-testid="open-filters" @click="filtersOpen = true">
            <SlidersHorizontal :size="16" aria-hidden="true" />
            {{ $t('shop.filters') }}<template v-if="active.length"> ({{ active.length }})</template>
          </UiButton>
          <div class="w-[176px] md:w-[208px]">
            <UiSelect v-model="sortModel" :label="$t('shop.sortBy')" name="sort" :options="sortOptions" hide-label data-testid="sort" />
          </div>
          <div role="group" :aria-label="$t('shop.density')" class="flex rounded-xs border border-line bg-surface">
            <UiIconButton :label="$t('shop.densityComfortable')" :pressed="state.density === 'comfortable'" data-testid="density-comfortable" @click="update({ density: 'comfortable', page: state.page })">
              <Grid2x2 :size="18" aria-hidden="true" />
            </UiIconButton>
            <UiIconButton :label="$t('shop.densityCompact')" :pressed="state.density === 'compact'" data-testid="density-compact" @click="update({ density: 'compact', page: state.page })">
              <Grid3x3 :size="18" aria-hidden="true" />
            </UiIconButton>
          </div>
        </div>
      </div>

      <!-- Active filters -->
      <div v-if="active.length" class="flex flex-wrap items-center gap-2" data-testid="active-filters">
        <UiFilterChip v-for="a in active" :key="a.key" :pressed="true" :aria-label="$t('shop.removeFilter', { name: a.label })" @click="update(a.clear)">
          {{ a.label }} <X :size="14" aria-hidden="true" />
        </UiFilterChip>
        <button type="button" class="link inline-flex min-h-11 items-center px-2 type-body-s md:min-h-0" @click="clearAll">{{ $t('shop.clearAll') }}</button>
      </div>

      <ProductGrid v-if="loading || paged.items.length" :cards="paged.items" :density="state.density" :loading="loading" />
      <UiEmptyState v-else :title="$t('shop.noMatchTitle')" :body="$t('shop.noMatchBody')">
        <template #icon><SlidersHorizontal :size="26" aria-hidden="true" /></template>
        <UiButton variant="secondary" @click="clearAll">{{ $t('shop.clearFilters') }}</UiButton>
      </UiEmptyState>

      <UiPagination :page="paged.page" :pages="paged.pages" class="mt-4" />
    </div>

    <!-- Mobile filter drawer -->
    <UiDrawer v-model:open="filtersOpen" :title="$t('shop.filters')" side="left">
      <div class="px-4 py-6">
        <ShopFilters :state="state" :facets="facets" :show-categories="!lockedCategory" id-prefix="drawer" @change="update" />
      </div>
      <template #footer>
        <div class="flex gap-3">
          <UiButton variant="secondary" class="flex-1" @click="clearAll">{{ $t('shop.clearAll') }}</UiButton>
          <UiButton class="flex-1" data-testid="show-results" @click="filtersOpen = false">{{ $t('shop.showResults', { n: filtered.length }, filtered.length) }}</UiButton>
        </div>
      </template>
    </UiDrawer>
  </div>
</template>
