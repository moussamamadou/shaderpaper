<script setup lang="ts">
import { Check, Palette, Printer, Shapes, Truck } from 'lucide-vue-next'
import type { CatalogProduct } from '#shared/utils/catalog'
import type { PosterLineMetadata, ShaderDesign, Strength } from '#shared/utils/design'
import type { EnginePalettes } from '~/components/poster/Preview.vue'

/**
 * The product page is the customiser. Left: the live preview (the shader
 * engine in an iframe) inside the frame mockup, sticky. Right: title, price,
 * the four shape knobs, palette and strength, variation, size and frame, Add
 * to cart, quick facts and the details accordion. Below lg the controls sit
 * under three tabs (Shape, Colour, Size & frame) with a sticky add bar.
 *
 * The design, size and frame live in the URL query (?v=&k=&pal=&lvl=&size=&frame=),
 * so a configuration can be shared; Add to cart stores the design on the line
 * as metadata.poster (see shared/utils/design.ts).
 */
const route = useRoute()
const router = useRouter()
const cc = useCountryCode()
const { t } = useI18n()
const handle = computed(() => String(route.params.handle ?? ''))
const { getProduct, useCatalogCards } = useCatalog()

const { data: product, error } = await useAsyncData(
  () => `poster-${cc.value}-${handle.value}`,
  () => getProduct(handle.value),
  { watch: [handle] },
)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: t('errors.productLoad'), fatal: true })
}
if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: t('errors.posterNotFound'), fatal: true })
}
const p = computed(() => product.value!)
const posterId = computed(() => posterIdOf(p.value as unknown as CatalogProduct))
const knobs = computed(() => normalizeKnobDefs(p.value.metadata?.knobs))
const card = computed(() => toCard(p.value as unknown as CatalogProduct))

// ---- design ------------------------------------------------------------------
const baseDesign = computed<ShaderDesign>(() => {
  const shader = p.value.metadata?.shader as { strength?: unknown } | undefined
  const strength = isStrength(shader?.strength) ? (shader!.strength as Strength) : 'b'
  return defaultDesign(posterId.value, { seed: defaultSeedOf(p.value as unknown as CatalogProduct), strength })
})
const design = ref<ShaderDesign>(designFromQuery(route.query as Record<string, string>, baseDesign.value))

// ---- size and frame --------------------------------------------------------------
const sizes = computed(() => optionValues(p.value as never, 'size'))
const frames = computed(() => optionValues(p.value as never, 'frame'))
const pick = (q: unknown, list: string[], fallback: string | null) =>
  typeof q === 'string' && list.includes(q) ? q : fallback
const size = ref<string | null>(pick(route.query.size, sizes.value, sizes.value[0] ?? null))
const frame = ref<string | null>(pick(route.query.frame, frames.value, frames.value[0] ?? null))
const variant = computed(() => findVariant(p.value as never, size.value, frame.value))
const priceOf = (s: string | null, f: string | null) => findVariant(p.value as never, s, f)?.calculated_price ?? null
const price = computed(() => variant.value?.calculated_price ?? null)
const currency = computed(() => price.value?.currency_code ?? card.value.price?.currency ?? null)
const { format } = useMoney()
const sizeScale = computed(() => {
  const i = Math.max(0, sizes.value.indexOf(size.value ?? ''))
  const n = sizes.value.length
  return n > 1 ? 0.7 + (i * 0.24) / (n - 1) : 0.86
})
const frameSwatch = (value: string) => ({ none: '', black: '#161616', white: '#F7F7F5', oak: '#C49A6C' })[frameKeyOf(value)]

// ---- URL sync (replace, debounced: a slider drag is not a history entry) -----------
const routeQuery = () => {
  const q: Record<string, string> = {}
  if (!sameDesign(design.value, baseDesign.value)) Object.assign(q, designToQuery(design.value))
  if (size.value && size.value !== sizes.value[0]) q.size = size.value
  if (frame.value && frame.value !== frames.value[0]) q.frame = frame.value
  return q
}
let lastWritten = JSON.stringify(routeQuery())
let urlTimer: ReturnType<typeof setTimeout> | undefined
watch([design, size, frame], () => {
  clearTimeout(urlTimer)
  urlTimer = setTimeout(() => {
    const q = routeQuery()
    const s = JSON.stringify(q)
    if (s === lastWritten) return
    lastWritten = s
    router.replace({ query: q })
  }, 300)
}, { deep: true })
// A link to this page with another design (e.g. from a cart line) while it is open.
watch(
  () => route.query,
  (q) => {
    const asRoute = JSON.stringify(Object.fromEntries(Object.entries(q).filter(([, v]) => typeof v === 'string')))
    if (asRoute === lastWritten) return
    design.value = designFromQuery(q as Record<string, string>, baseDesign.value)
    size.value = pick(q.size, sizes.value, sizes.value[0] ?? null)
    frame.value = pick(q.frame, frames.value, frames.value[0] ?? null)
    lastWritten = JSON.stringify(routeQuery())
  },
)
onBeforeUnmount(() => clearTimeout(urlTimer))

// ---- engine feedback ---------------------------------------------------------
const palettes = ref<EnginePalettes['palettes']>([])
const paintedPalette = ref<number | null>(null)
const onRendered = (info: { pal: number | null }) => {
  paintedPalette.value = info.pal
}
const onPalettes = (info: EnginePalettes) => {
  palettes.value = info.palettes
  if (paintedPalette.value == null) paintedPalette.value = info.current
}
const previewError = ref<string | null>(null)

const newVariation = () => {
  let seed = design.value.seed
  // A fresh variation: a different seed, every knob and the palette back to the seed's choice.
  while (seed === design.value.seed) seed = 1 + Math.floor(Math.random() * 9999)
  design.value = { ...design.value, seed, knobs: [null, null, null, null], palette: null }
}
const reset = () => {
  design.value = { ...baseDesign.value, knobs: baseDesign.value.knobs.slice() }
}

// ---- add to cart --------------------------------------------------------------
const preview = ref<{ snapshot: (w?: number) => string | null } | null>(null)
const { addToCart } = useCart()
const drawer = useCartDrawer()
const { push } = useToast()
const adding = ref(false)
const add = async () => {
  if (!variant.value || adding.value) return
  adding.value = true
  try {
    const thumbnail = preview.value?.snapshot(160) ?? null
    const poster: PosterLineMetadata = {
      version: 1,
      design: { ...design.value, knobs: design.value.knobs.slice() },
      title: p.value.title ?? posterId.value,
      ...(thumbnail ? { thumbnail } : {}),
    }
    await addToCart({ variantId: variant.value.id, quantity: 1, countryCode: cc.value, metadata: { poster } })
    const line = [p.value.title, size.value, frame.value].filter(Boolean).join(' · ')
    drawer.open({ message: t('product.addedAnnounce', { title: line }), added: line })
  } catch (err) {
    const body = (err as { data?: { message?: string } })?.data?.message ?? (err instanceof Error ? err.message : '')
    push({ tone: 'error', title: t('product.addFailed'), body })
  } finally {
    adding.value = false
  }
}

// ---- mobile tabs -----------------------------------------------------------------
type Tab = 'shape' | 'colour' | 'size'
const tab = ref<Tab>('shape')
const tabs = computed<{ value: Tab; label: string }[]>(() => [
  { value: 'shape', label: t('customiser.tabShape') },
  { value: 'colour', label: t('customiser.tabColour') },
  { value: 'size', label: t('customiser.tabSize') },
])
const pid = `pdp-${useId()}`
// Tab roles only apply where the tabs are shown (below lg); set after mount so SSR and hydration agree.
const tabbed = ref(false)
let mq: MediaQueryList | null = null
const onMq = () => (tabbed.value = !(mq?.matches ?? false))
onMounted(() => {
  mq = window.matchMedia('(min-width: 1024px)')
  onMq()
  mq.addEventListener('change', onMq)
})
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))
const tabRefs = ref<HTMLButtonElement[]>([])
const onTabKey = (e: KeyboardEvent, i: number) => {
  const n = tabs.value.length
  const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
  if (next < 0) return
  e.preventDefault()
  tab.value = tabs.value[next]!.value
  tabRefs.value[next]?.focus()
}

// ---- related ------------------------------------------------------------------------
const { data: cards, status: cardsStatus } = useCatalogCards()
const related = computed(() => {
  const all = cards.value.filter((c) => c.id !== p.value.id)
  const same = all.filter((c) => c.category && c.category.handle === card.value.category?.handle)
  return [...same, ...all.filter((c) => !same.includes(c))].slice(0, 4)
})

// ---- head --------------------------------------------------------------------------
useSeoMeta({
  title: () => p.value.title ?? '',
  description: () => p.value.description ?? '',
  ogTitle: () => `${p.value.title} · ShaderPaper`,
  ogDescription: () => p.value.description ?? '',
})
const crumbs = computed(() => [
  { label: t('nav.shop'), to: '/shop' },
  ...(card.value.category ? [{ label: t(`categories.${card.value.category.handle}`, card.value.category.title), to: `/collections/${card.value.category.handle}` }] : []),
  { label: p.value.title ?? '' },
])
const details = computed(() => [
  { value: 'about', title: t('product.detailsAbout') },
  { value: 'customise', title: t('product.detailsCustomise') },
  { value: 'print', title: t('product.detailsPrint') },
  { value: 'shipping', title: t('product.detailsShipping') },
])
</script>

<template>
  <div class="pb-32 lg:pb-0">
    <div class="page pt-4 lg:pt-6">
      <UiBreadcrumbs :items="crumbs" />
    </div>

    <div class="page mt-3 lg:mt-6 lg:grid lg:grid-cols-12 lg:gap-x-6">
      <!-- Preview: sticky under the header -->
      <div class="sticky top-14 z-20 -mx-4 bg-paper md:-mx-8 lg:top-[88px] lg:col-span-7 lg:mx-0 lg:self-start">
        <div class="h-[44svh] min-h-[280px] lg:h-[calc(100svh-120px)] lg:max-h-[880px] lg:min-h-[560px]">
          <PosterMockup :frame="frame" :scale="sizeScale" :aspect="false">
            <PosterPreview
              ref="preview"
              :design="design"
              :title="p.title ?? ''"
              :placeholder="p.thumbnail"
              @rendered="onRendered"
              @palettes="onPalettes"
              @error="(m) => (previewError = m)"
            />
          </PosterMockup>
        </div>
        <p class="hidden px-1 pt-3 type-caption text-ink-3 lg:block">{{ $t('product.previewNote') }}</p>
      </div>

      <!-- Buy panel -->
      <div class="mt-6 flex flex-col gap-6 lg:col-span-5 lg:mt-0 lg:pl-6">
        <header class="flex flex-col gap-2">
          <p v-if="card.category" class="eyebrow">
            <NuxtLink :to="`/${cc}/collections/${card.category.handle}`" class="hover:text-ink">{{ $t(`categories.${card.category.handle}`, card.category.title) }}</NuxtLink>
            <UiBadge v-if="card.isNew" tone="new" class="ml-2 align-middle">{{ $t('product.new') }}</UiBadge>
          </p>
          <h1 class="type-h1" data-testid="product-title">{{ p.title }}</h1>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <UiPriceTag :amount="price?.calculated_amount" :currency="currency" :original="price?.original_amount" size="lg" data-testid="product-price" />
            <span class="type-caption text-ink-3">{{ [size, frame].filter(Boolean).join(' · ') }}</span>
          </div>
          <p v-if="p.description" class="type-body text-ink-2">{{ p.description }}</p>
        </header>

        <!-- Mobile tabs -->
        <div role="tablist" :aria-label="$t('customiser.tabsLabel')" class="sticky top-[calc(max(44svh,280px)+56px)] z-10 -mx-4 flex border-b border-line bg-paper px-4 md:-mx-8 md:px-8 lg:hidden">
          <button
            v-for="(tb, i) in tabs"
            :id="`${pid}-${tb.value}-tab`"
            :key="tb.value"
            ref="tabRefs"
            type="button"
            role="tab"
            :aria-selected="tab === tb.value"
            :aria-controls="`${pid}-${tb.value}`"
            :tabindex="tab === tb.value ? 0 : -1"
            :class="['min-h-11 flex-1 border-b-2 type-label transition-colors duration-fast', tab === tb.value ? 'border-ink text-ink' : 'border-transparent text-ink-3']"
            @click="tab = tb.value"
            @keydown="onTabKey($event, i)"
          >
            {{ tb.label }}
          </button>
        </div>

        <ProductCustomiser
          v-model="design"
          :knobs="knobs"
          :palettes="palettes"
          :current-palette="paintedPalette"
          :section="tab"
          :panel-id="pid"
          :tabbed="tabbed"
          @variation="newVariation"
          @reset="reset"
        />

        <!-- Size and frame -->
        <div
          :id="`${pid}-size`"
          v-bind="tabbed ? { role: 'tabpanel', 'aria-labelledby': `${pid}-size-tab`, tabindex: -1 } : {}"
          :class="['flex flex-col gap-6', tab !== 'size' ? 'max-lg:hidden' : '']"
        >
          <fieldset v-if="sizes.length" class="min-w-0">
            <legend class="mb-2 type-label text-ink">{{ $t('product.size') }}</legend>
            <div class="grid grid-cols-3 gap-2" data-testid="size-options">
              <UiOptionTile
                v-for="s in sizes"
                :key="s"
                v-model="size"
                :value="s"
                :name="`${pid}-size-opt`"
                :label="s"
                :sub="format(priceOf(s, frame)?.calculated_amount, currency, { whole: true })"
                :unavailable="!priceOf(s, frame)"
              />
            </div>
          </fieldset>
          <fieldset v-if="frames.length" class="min-w-0">
            <legend class="mb-2 type-label text-ink">{{ $t('product.frame') }}</legend>
            <div class="grid grid-cols-2 gap-2" data-testid="frame-options">
              <UiOptionTile
                v-for="f in frames"
                :key="f"
                v-model="frame"
                :value="f"
                :name="`${pid}-frame-opt`"
                :label="f"
                :swatch="frameSwatch(f)"
                :sub="format(priceOf(size, f)?.calculated_amount, currency, { whole: true })"
                :unavailable="!priceOf(size, f)"
              />
            </div>
          </fieldset>
        </div>

        <!-- Add to cart (desktop; mobile has the sticky bar) -->
        <div class="hidden flex-col gap-3 lg:flex">
          <UiButton size="lg" block :loading="adding" :disabled="!variant" data-testid="add-to-cart" @click="add">
            {{ $t('product.addToCart') }}<template v-if="price"> · {{ format(price.calculated_amount, currency, { whole: true }) }}</template>
          </UiButton>
          <p v-if="!variant" class="type-body-s text-danger" role="status">{{ $t('product.unavailable') }}</p>
        </div>

        <!-- Quick facts: only what is true today -->
        <ul class="grid grid-cols-1 gap-3 border-y border-line py-5 sm:grid-cols-2">
          <li class="flex gap-3">
            <Printer :size="18" class="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            <div><p class="type-body-s font-medium">{{ $t('product.factMadeToOrder') }}</p><p class="type-caption text-ink-3">{{ $t('product.factMadeToOrderBody') }}</p></div>
          </li>
          <li class="flex gap-3">
            <Shapes :size="18" class="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            <div><p class="type-body-s font-medium">{{ $t('product.factYours') }}</p><p class="type-caption text-ink-3">{{ $t('product.factYoursBody') }}</p></div>
          </li>
          <li class="flex gap-3">
            <Truck :size="18" class="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            <div><p class="type-body-s font-medium">{{ $t('product.factShipping') }}</p><p class="type-caption text-ink-3">{{ $t('product.factShippingBody') }}</p></div>
          </li>
          <li class="flex gap-3">
            <Palette :size="18" class="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            <div><p class="type-body-s font-medium">{{ $t('product.factPaper') }}</p><p class="type-caption text-ink-3">{{ $t('product.factPaperBody') }}</p></div>
          </li>
        </ul>

        <UiAccordion :items="details" heading-level="h2">
          <template #about>
            <p>{{ p.description || $t('product.noDescription') }}</p>
          </template>
          <template #customise>
            <ul class="flex flex-col gap-2">
              <li v-for="n in 4" :key="n" class="flex gap-2"><Check :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />{{ $t(`product.howCustomise${n}`) }}</li>
            </ul>
          </template>
          <template #print>
            <InfoTbw :what="$t('product.tbwPrint')" compact />
          </template>
          <template #shipping>
            <div class="flex flex-col gap-3">
              <InfoTbw :what="$t('product.tbwShipping')" compact />
              <p>
                <NuxtLink :to="`/${cc}/shipping`" class="link">{{ $t('footer.shipping') }}</NuxtLink> ·
                <NuxtLink :to="`/${cc}/returns`" class="link">{{ $t('footer.returns') }}</NuxtLink>
              </p>
            </div>
          </template>
        </UiAccordion>
      </div>
    </div>

    <div class="mt-16 lg:mt-24">
      <ProductRail
        :title="$t('product.related')"
        :eyebrow="card.category ? $t(`categories.${card.category.handle}`, card.category.title) : ''"
        :cards="related"
        :loading="cardsStatus === 'pending' && !cards.length"
        more-to="/shop"
        :more-label="$t('home.viewAll')"
      />
    </div>

    <!-- Mobile: sticky add bar -->
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <UiPriceTag :amount="price?.calculated_amount" :currency="currency" size="sm" />
          <p class="truncate type-caption text-ink-3">{{ [size, frame].filter(Boolean).join(' · ') }}</p>
        </div>
        <UiButton size="lg" :loading="adding" :disabled="!variant" data-testid="add-to-cart-mobile" @click="add">{{ $t('product.addToCart') }}</UiButton>
      </div>
    </div>
  </div>
</template>
