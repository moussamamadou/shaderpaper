<script setup lang="ts">
/**
 * The poster on a wall: a 3:4 sheet in its frame (none, black, white, oak:
 * tokens frame-*), scaled by the chosen size so 30 × 40 reads smaller than
 * 60 × 80. The sheet itself is the default slot (the live preview or an image).
 *
 * The figure is a size container: the sheet is sized against both its width
 * and its height (cqw / cqh), so it fits whatever box the page gives it. With
 * `aspect` (default) the figure is 5:6; without it the parent sets the size.
 */
const props = withDefaults(defineProps<{ frame?: string | null; scale?: number; caption?: string; aspect?: boolean }>(), {
  frame: null,
  scale: 0.86,
  caption: '',
  aspect: true,
})
const key = computed(() => frameKeyOf(props.frame))
const frameColor = computed(() => ({ none: null, black: '#161616', white: '#F7F7F5', oak: '#C49A6C' })[key.value])
// Framed sheet of width W: the art (POSTER_ASPECT) plus the moulding is about (h/w + 0.09) W tall.
// Capping W by both container axes keeps it inside the figure at any size.
const width = computed(() => {
  const k = Math.max(0.5, Math.min(0.96, props.scale))
  const tall = POSTER_ASPECT.h / POSTER_ASPECT.w + 0.09
  return `calc(${k} * min(87cqw, ${(90 / tall).toFixed(2)}cqh))`
})
</script>

<template>
  <figure
    :class="['relative m-0 flex w-full items-center justify-center overflow-hidden bg-sunken', aspect ? 'aspect-[5/6]' : 'h-full']"
    style="container-type: size"
    data-testid="poster-mockup"
    :data-frame="key"
  >
    <div class="relative transition-[width] duration-slow ease reduced:transition-none" :style="{ width }">
      <div
        :class="['relative shadow-poster', key === 'oak' ? 'bg-[linear-gradient(135deg,#d2ab80,#b98a5c_45%,#c9a173)]' : '']"
        :style="frameColor ? { padding: '4.5%', background: key === 'oak' ? undefined : frameColor, outline: key === 'white' ? '1px solid rgba(17,17,17,0.10)' : undefined } : {}"
      >
        <div :class="['relative aspect-poster w-full overflow-hidden bg-[#f2f0ea]', frameColor ? 'shadow-[inset_0_0_6px_rgba(0,0,0,0.25)]' : '']">
          <slot />
        </div>
      </div>
    </div>
    <figcaption v-if="caption" class="absolute bottom-3 left-4 type-caption text-ink-3">{{ caption }}</figcaption>
  </figure>
</template>
