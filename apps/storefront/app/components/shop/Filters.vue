<script setup lang="ts">
import type { Facets, ShopQuery } from '#shared/utils/catalog'

/**
 * The shop's filters: collections (checkboxes with counts) and a price range
 * on the "from" price. Used in the desktop sidebar and in the mobile filter
 * drawer. Emits the patch to apply; the parent writes it to the URL.
 */
const props = withDefaults(defineProps<{ state: ShopQuery; facets: Facets; showCategories?: boolean; idPrefix?: string }>(), {
  showCategories: true,
  idPrefix: 'f',
})
const emit = defineEmits<{ change: [patch: Partial<ShopQuery>] }>()
const { t } = useI18n()
const { format } = useMoney()

const toggle = (handle: string, on: boolean) => {
  const set = new Set(props.state.categories)
  if (on) set.add(handle)
  else set.delete(handle)
  emit('change', { categories: [...set] })
}

const min = ref(props.state.min == null ? '' : String(props.state.min))
const max = ref(props.state.max == null ? '' : String(props.state.max))
watch(
  () => [props.state.min, props.state.max],
  ([a, b]) => {
    min.value = a == null ? '' : String(a)
    max.value = b == null ? '' : String(b)
  },
)
const priceError = ref<string | null>(null)
const applyPrice = () => {
  const lo = min.value.trim() === '' ? null : Number(min.value)
  const hi = max.value.trim() === '' ? null : Number(max.value)
  if ((lo != null && (!Number.isFinite(lo) || lo < 0)) || (hi != null && (!Number.isFinite(hi) || hi < 0))) {
    priceError.value = t('shop.priceInvalid')
    return
  }
  if (lo != null && hi != null && lo > hi) {
    priceError.value = t('shop.priceOrder')
    return
  }
  priceError.value = null
  emit('change', { min: lo, max: hi })
}
const currencySymbol = computed(() => {
  const c = props.facets.price?.currency
  if (!c) return ''
  return (format(0, c, { whole: true }) || '').replace(/[\d\s.,]/g, '') || c.toUpperCase()
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <fieldset v-if="showCategories && facets.categories.length" class="min-w-0">
      <legend class="mb-2 type-label text-ink">{{ $t('shop.collection') }}</legend>
      <div class="flex flex-col">
        <div v-for="c in facets.categories" :key="c.handle" class="flex items-center justify-between gap-3">
          <UiCheckbox
            :model-value="state.categories.includes(c.handle)"
            :label="$t(`categories.${c.handle}`, c.title)"
            :name="`${idPrefix}-cat-${c.handle}`"
            @update:model-value="(v: boolean) => toggle(c.handle, v)"
          />
          <span class="type-caption tabular-nums text-ink-3" aria-hidden="true">{{ c.count }}</span>
        </div>
      </div>
    </fieldset>

    <form class="flex flex-col gap-3" novalidate @submit.prevent="applyPrice">
      <fieldset class="min-w-0">
        <legend class="mb-1 type-label text-ink">{{ $t('shop.price') }}</legend>
        <p class="mb-3 type-caption text-ink-3">
          <template v-if="facets.price">{{ $t('shop.priceHint', { min: format(facets.price.min, facets.price.currency, { whole: true }), max: format(facets.price.max, facets.price.currency, { whole: true }) }) }}</template>
        </p>
        <div class="grid grid-cols-2 gap-3">
          <UiTextField v-model="min" :label="$t('shop.priceMin', { currency: currencySymbol })" :name="`${idPrefix}-min`" type="number" inputmode="numeric" min="0" />
          <UiTextField v-model="max" :label="$t('shop.priceMax', { currency: currencySymbol })" :name="`${idPrefix}-max`" type="number" inputmode="numeric" min="0" />
        </div>
      </fieldset>
      <p v-if="priceError" class="type-body-s text-danger" role="alert">{{ priceError }}</p>
      <UiButton type="submit" variant="secondary" size="sm">{{ $t('shop.applyPrice') }}</UiButton>
    </form>
  </div>
</template>
