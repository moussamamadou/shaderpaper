<script setup lang="ts">
import type { ShaderDesign } from '#shared/utils/design'

/**
 * The print render page, for apps/print-renderer (headless Chrome), never
 * for people (noindex, no chrome, no region redirect).
 *
 *   /render?d=<base64url JSON design>&size=<id>&mm=<w>x<h>
 *
 * Contract (same as MapAndSky's poster/render page): the page lays the
 * poster out at a logical size, short side 1000 CSS px and the ratio of
 * `mm` (portrait unless the viewport is landscape), and publishes
 * `window.__POSTER_SIZE__ = { width, height }`. The renderer opens it at that
 * viewport with deviceScaleFactor = output px / logical px, waits for
 * `window.__POSTER_READY__ === true` (set after the engine's first paint) or
 * `window.__POSTER_ERROR__` (a message), then captures the page.
 *
 * The art keeps its own aspect (POSTER_ASPECT, 3:4, the print sizes' aspect)
 * and is centred on the white sheet ("contain"), so it fills a 3:4 sheet
 * exactly; see shared/utils/aspect.ts. The engine draws at the device pixel ratio, capped at
 * 4 and at 4096 px a side (WebGL limits), so large sizes are upscaled by the
 * capture: a known limit, documented in docs/storefront/storefront.md.
 */
definePageMeta({ layout: false })
useSeoMeta({ robots: 'noindex, nofollow', title: 'Render' })
useHead({ bodyAttrs: { style: 'margin:0;background:#fff;overflow:hidden' }, htmlAttrs: { style: 'background:#fff' } })

declare global {
  interface Window {
    __POSTER_READY__?: boolean
    __POSTER_ERROR__?: string | null
    __POSTER_SIZE__?: { width: number; height: number } | null
  }
}

const route = useRoute()
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
const design = computed<ShaderDesign | null>(() => decodeDesign(first(route.query.d)))
const mm = computed(() => {
  const m = String(first(route.query.mm) ?? '').match(/^(\d{2,4})x(\d{2,4})$/)
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null
})

const SHORT = 1000
const page = ref<{ width: number; height: number } | null>(null)
const art = computed(() => (page.value ? fitArt(page.value) : null))
const src = ref('')
const frame = ref<HTMLIFrameElement | null>(null)

const fail = (message: string) => {
  window.__POSTER_ERROR__ = message
  window.__POSTER_READY__ = false
}

const onMessage = (e: MessageEvent) => {
  if (!frame.value || e.source !== frame.value.contentWindow) return
  const m = e.data as { type?: string; message?: string }
  if (m?.type === 'sp:rendered') {
    // Two frames so the composited canvas is on screen before the capture.
    requestAnimationFrame(() => requestAnimationFrame(() => (window.__POSTER_READY__ = true)))
  } else if (m?.type === 'sp:error') {
    fail(`engine: ${m.message ?? 'error'}`)
  }
}

onMounted(() => {
  window.__POSTER_READY__ = false
  window.__POSTER_ERROR__ = null
  const d = design.value
  if (!d) return fail('invalid or missing design (?d= must be base64url JSON of a shader design)')
  // Sheet: short side 1000 CSS px, ratio from mm (print size) or the art's own aspect.
  const ratio = mm.value ? Math.max(mm.value.w, mm.value.h) / Math.min(mm.value.w, mm.value.h) : POSTER_ASPECT.h / POSTER_ASPECT.w
  const landscape = window.innerWidth > window.innerHeight
  const long = Math.round(SHORT * ratio)
  page.value = landscape ? { width: long, height: SHORT } : { width: SHORT, height: long }
  window.__POSTER_SIZE__ = { ...page.value }
  window.addEventListener('message', onMessage)
  const dpr = Math.max(1, Math.min(4, Math.round((window.devicePixelRatio || 1) * 100) / 100))
  src.value = `/engine/index.html${engineHash(d, { dpr })}`
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <div
    v-if="page && art"
    data-testid="render-sheet"
    :style="{ position: 'relative', width: `${page.width}px`, height: `${page.height}px`, background: '#fff', overflow: 'hidden' }"
  >
    <iframe
      v-if="src"
      ref="frame"
      :src="src"
      title="Poster"
      :style="{ position: 'absolute', left: `${art.x}px`, top: `${art.y}px`, width: `${art.width}px`, height: `${art.height}px`, border: '0' }"
    />
  </div>
</template>
