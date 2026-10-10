<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import { Trash2 } from 'lucide-vue-next'

/**
 * One cart line: poster thumbnail (the buyer's own preview when stored),
 * title, size and frame, the design in words, quantity and remove. Errors go
 * to a toast; the parent announces successful changes.
 */
const props = withDefaults(defineProps<{ item: HttpTypes.StoreCartLineItem; currency: string; compact?: boolean; editable?: boolean }>(), {
  compact: false,
  editable: true,
})
const emit = defineEmits<{ changed: [message: string] }>()
const { t } = useI18n()
const { updateLineItem, deleteLineItem } = useCart()
const { push } = useToast()
const cc = useCountryCode()

const poster = computed(() => lineDesign(props.item.metadata))
const parts = computed(() => variantParts(props.item.variant as never))
// "No frame" reads as is; "Black" becomes "Black frame".
const frameLabel = computed(() =>
  !parts.value.frame ? null : frameKeyOf(parts.value.frame) === 'none' ? parts.value.frame : t('cart.frameValue', { frame: parts.value.frame }),
)
const summary = computed(() =>
  poster.value ? designSummary(poster.value.design, (props.item.product as { metadata?: Record<string, unknown> } | undefined)?.metadata?.knobs, t) : [],
)
const title = computed(() => props.item.product_title || props.item.title || '')
const href = computed(() => {
  const handle = props.item.product_handle || (props.item.product as { handle?: string } | undefined)?.handle
  if (!handle) return null
  const q = poster.value ? new URLSearchParams(designToQuery(poster.value.design)) : null
  if (q && parts.value.size) q.set('size', parts.value.size)
  if (q && parts.value.frame) q.set('frame', parts.value.frame)
  return `/${cc.value}/posters/${handle}${q ? `?${q}` : ''}`
})
const busy = ref<'qty' | 'remove' | null>(null)
const errorText = (err: unknown) => (err as { data?: { message?: string } })?.data?.message ?? (err instanceof Error ? err.message : String(err))

const setQty = async (quantity: number) => {
  busy.value = 'qty'
  try {
    await updateLineItem({ lineId: props.item.id, quantity })
    emit('changed', t('cart.quantityUpdated', { title: title.value, n: quantity }))
  } catch (err) {
    push({ tone: 'error', title: t('cart.updateFailed'), body: errorText(err) })
  } finally {
    busy.value = null
  }
}
const remove = async () => {
  busy.value = 'remove'
  try {
    await deleteLineItem(props.item.id)
    emit('changed', t('cart.removed', { title: title.value }))
  } catch (err) {
    push({ tone: 'error', title: t('cart.removeFailed'), body: errorText(err) })
    busy.value = null
  }
}
const { format } = useMoney()
</script>

<template>
  <li :class="['flex gap-4', compact ? 'py-4' : 'py-6', busy === 'remove' ? 'opacity-50' : '']" data-testid="cart-line">
    <NuxtLink v-if="href" :to="href" tabindex="-1" aria-hidden="true" class="shrink-0">
      <PosterThumb :src="poster?.thumbnail" :fallback="item.thumbnail" :frame="parts.frame" :width="compact ? 72 : 112" />
    </NuxtLink>
    <PosterThumb v-else :src="poster?.thumbnail" :fallback="item.thumbnail" :frame="parts.frame" :width="compact ? 72 : 112" />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="type-body font-medium text-ink">
            <NuxtLink v-if="href" :to="href" class="hover:underline hover:underline-offset-4">{{ title }}</NuxtLink>
            <template v-else>{{ title }}</template>
          </h3>
          <p class="type-body-s text-ink-2">
            {{ [parts.size, frameLabel].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <p class="shrink-0 type-body-s font-medium tabular-nums text-ink">{{ format(item.total ?? item.subtotal ?? item.unit_price * item.quantity, currency) }}</p>
      </div>
      <ul v-if="summary.length" class="flex flex-col gap-0.5 type-caption text-ink-3" :aria-label="$t('cart.yourDesign')" data-testid="design-summary">
        <li v-for="(s, i) in summary" :key="i">{{ s }}</li>
      </ul>
      <div v-if="editable" class="mt-1 flex items-center justify-between gap-3">
        <UiQuantityStepper
          :model-value="item.quantity"
          :disabled="busy !== null"
          :label="$t('cart.quantityFor', { title })"
          size="sm"
          @update:model-value="setQty"
        />
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-1 px-1 type-body-s text-ink-2 hover:text-danger md:min-h-8"
          :disabled="busy !== null"
          :aria-label="$t('cart.removeTitle', { title })"
          data-testid="remove-line"
          @click="remove"
        >
          <UiSpinner v-if="busy === 'remove'" :size="16" />
          <Trash2 v-else :size="16" aria-hidden="true" />
          <span>{{ $t('cart.remove') }}</span>
        </button>
      </div>
      <p v-else class="type-body-s text-ink-2">{{ $t('cart.qtyN', { n: item.quantity }) }}</p>
    </div>
  </li>
</template>
