<script setup lang="ts">
import type { ShaderDesign } from '#shared/utils/design'

/**
 * The live preview: the shader engine (public/engine/index.html, copied from
 * explorations/) in embed mode inside an iframe, driven by postMessage.
 *
 *   → sp:set (the design), sp:palettes (ask for the palette list)
 *   ← sp:ready, sp:rendered {ms, fam, pal, seq}, sp:palettes {fam, palettes, current, knobs}, sp:error
 *
 * Until the first paint the product thumbnail stands in. `snapshot()` reads
 * the painted canvas (same origin) for the cart line's small preview.
 */
export interface EnginePalettes {
  fam: string | null
  palettes: { n: string; c: string[] }[]
  current: number | null
  knobs: unknown[]
}

const props = withDefaults(defineProps<{ design: ShaderDesign; title: string; placeholder?: string | null; dpr?: number }>(), {
  placeholder: null,
  dpr: undefined,
})
const emit = defineEmits<{
  rendered: [info: { ms: number; fam: string | null; pal: number | null; w: number; h: number }]
  palettes: [info: EnginePalettes]
  error: [message: string]
}>()

const frame = ref<HTMLIFrameElement | null>(null)
// The iframe is created after mount, so the message listener exists before the engine can talk.
const mounted = ref(false)
const ready = ref(false)
let dirty = false
const painted = ref(false)
const busy = ref(false)
const failed = ref<string | null>(null)
let seq = 0
let lastAsked = ''
let slowTimer: ReturnType<typeof setTimeout> | undefined

// The first design goes in the URL hash so the engine paints without waiting for a message.
const src = ref('')

const post = (msg: Record<string, unknown>) => {
  const win = frame.value?.contentWindow
  if (win) win.postMessage(msg, window.location.origin)
}
const send = () => {
  if (!ready.value) {
    dirty = true
    return
  }
  dirty = false
  seq++
  clearTimeout(slowTimer)
  slowTimer = setTimeout(() => (busy.value = true), 160)
  post(engineMessage(props.design, seq))
}
const askPalettes = () => {
  const key = `${props.design.id}|${props.design.strength}`
  if (key === lastAsked) return
  lastAsked = key
  post({ type: 'sp:palettes', id: props.design.id })
}

const onMessage = (e: MessageEvent) => {
  if (!frame.value || e.source !== frame.value.contentWindow) return
  const m = e.data as Record<string, unknown>
  if (!m || typeof m !== 'object') return
  if (m.type === 'sp:ready') {
    ready.value = true
    if (dirty) send()
  } else if (m.type === 'sp:rendered') {
    ready.value = true
    // Ignore a paint that a newer design has already superseded.
    if (typeof m.seq === 'number' && m.seq !== seq) return
    clearTimeout(slowTimer)
    busy.value = false
    painted.value = true
    failed.value = null
    emit('rendered', { ms: Number(m.ms) || 0, fam: (m.fam as string) ?? null, pal: (m.pal as number) ?? null, w: Number(m.w), h: Number(m.h) })
    askPalettes()
  } else if (m.type === 'sp:palettes') {
    emit('palettes', {
      fam: (m.fam as string) ?? null,
      palettes: Array.isArray(m.palettes) ? (m.palettes as EnginePalettes['palettes']) : [],
      current: typeof m.current === 'number' ? m.current : null,
      knobs: Array.isArray(m.knobs) ? m.knobs : [],
    })
  } else if (m.type === 'sp:error') {
    clearTimeout(slowTimer)
    busy.value = false
    failed.value = String(m.message ?? 'error')
    emit('error', failed.value)
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  src.value = `/engine/index.html${engineHash(props.design, props.dpr ? { dpr: props.dpr } : {})}`
  dirty = false
  mounted.value = true
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearTimeout(slowTimer)
})

// Coalesce bursts (slider drags) to one message per frame; the engine also renders at most once per frame.
let raf = 0
watch(
  () => [props.design.id, props.design.seed, props.design.palette, props.design.strength, ...props.design.knobs],
  () => {
    if (!import.meta.client) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(send)
  },
)
watch(
  () => props.design.strength,
  () => {
    lastAsked = ''
  },
)

/** A small image of the current paint (data URL), or null when the canvas cannot be read. */
const snapshot = (width = 150, type = 'image/webp', quality = 0.72): string | null => {
  try {
    const cv = frame.value?.contentDocument?.getElementById('spembed') as HTMLCanvasElement | null
    if (!cv || !cv.width) return null
    const out = document.createElement('canvas')
    out.width = width
    out.height = Math.round((width * cv.height) / cv.width)
    out.getContext('2d')?.drawImage(cv, 0, 0, out.width, out.height)
    const url = out.toDataURL(type, quality)
    return url.length < 40_000 ? url : out.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}
defineExpose({ snapshot, painted, busy })
</script>

<template>
  <div class="absolute inset-0">
    <iframe
      v-if="mounted"
      ref="frame"
      :src="src"
      :title="$t('customiser.previewTitle', { title })"
      tabindex="-1"
      class="absolute inset-0 h-full w-full border-0"
      data-testid="engine-frame"
    />
    <img
      v-if="placeholder && !painted"
      :src="placeholder"
      alt=""
      class="pointer-events-none absolute inset-0 h-full w-full object-cover"
    />
    <div v-if="!painted && !failed" class="pointer-events-none absolute inset-0 skeleton opacity-40" aria-hidden="true" />
    <p
      v-if="busy"
      class="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-pill bg-surface/90 px-3 py-1 type-caption text-ink-2"
      aria-hidden="true"
    >
      <UiSpinner :size="12" /> {{ $t('customiser.rendering') }}
    </p>
    <p v-if="failed" class="absolute inset-x-3 bottom-3 rounded-xs bg-danger-bg px-3 py-2 type-body-s text-danger" role="alert">
      {{ $t('customiser.previewFailed') }}
    </p>
  </div>
</template>
