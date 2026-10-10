<script setup lang="ts">
/**
 * A small poster image for cart and order lines: the customised preview
 * stored with the line when there is one, else the product thumbnail, inside
 * a hairline frame in the chosen frame colour.
 */
const props = withDefaults(
  defineProps<{ src?: string | null; fallback?: string | null; alt?: string; frame?: string | null; width?: number }>(),
  { src: null, fallback: null, alt: '', frame: null, width: 80 },
)
const failed = ref(false)
const image = computed(() => (!failed.value && props.src) || props.fallback || null)
const border = computed(() => {
  const k = frameKeyOf(props.frame)
  return k === 'none' ? 'transparent' : { black: '#161616', white: '#F7F7F5', oak: '#C49A6C' }[k]
})
</script>

<template>
  <div
    class="shrink-0 bg-surface shadow-poster"
    :style="{ width: `${width}px`, padding: border === 'transparent' ? '0' : '3px', background: border === 'transparent' ? undefined : border }"
  >
    <div class="aspect-poster w-full overflow-hidden bg-sunken">
      <img v-if="image" :src="image" :alt="alt" class="h-full w-full object-cover" loading="lazy" decoding="async" @error="failed = true" />
    </div>
  </div>
</template>
