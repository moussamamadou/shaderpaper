<script setup lang="ts">
import type { StripeCardElement, StripeElements } from '@stripe/stripe-js'
import { StripeContextKey } from '~/utils/checkout'

/**
 * The Stripe card field (MapAndSky's StripeCardContainer), mounted while its
 * provider is selected and Stripe is ready; a skeleton otherwise. Styled
 * with the ShaderPaper tokens.
 */
const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ error: [message: string | null]; complete: [complete: boolean] }>()
const ctx = inject(StripeContextKey, null)
const ready = computed(() => ctx?.ready.value ?? false)
const mountEl = ref<HTMLDivElement | null>(null)
let el: StripeCardElement | null = null
let mountedFor: StripeElements | null = null
let mounting = false

const release = (destroy: boolean) => {
  if (el) {
    if (destroy) el.destroy()
    if (ctx && ctx.card.value === el) ctx.card.value = null
  }
  el = null
  mountedFor = null
}
const mount = async (elements: StripeElements) => {
  if (el || mounting) return
  mounting = true
  try {
    await nextTick()
    if (!mountEl.value) return
    el =
      (elements.getElement('card') as StripeCardElement | null) ??
      elements.create('card', {
        style: {
          base: { fontFamily: '"Geist Variable", system-ui, sans-serif', fontSize: '16px', color: '#141414', '::placeholder': { color: '#6B6760' } },
          invalid: { color: '#B42318' },
        },
      })
    el.mount(mountEl.value)
    el.on('change', (e) => {
      emit('error', e.error?.message ?? null)
      emit('complete', e.complete)
    })
    mountedFor = elements
    if (ctx) ctx.card.value = el
  } finally {
    mounting = false
  }
}
watch(
  [() => props.active, ready, () => ctx?.elements.value],
  async ([active, isReady]) => {
    const elements = ctx?.elements.value ?? null
    if (mountedFor && mountedFor !== elements) release(false)
    if (active && isReady && elements) await mount(elements)
    else release(true)
  },
  { immediate: true, flush: 'post' },
)
onBeforeUnmount(() => release(true))
</script>

<template>
  <div v-if="active" class="flex flex-col gap-2">
    <template v-if="ready">
      <p class="type-body-s font-medium">{{ $t('checkout.cardDetails') }}</p>
      <div ref="mountEl" class="rounded-xs border border-line bg-surface px-4 py-3" />
    </template>
    <UiSkeleton v-else variant="block" class="h-12" />
  </div>
</template>
