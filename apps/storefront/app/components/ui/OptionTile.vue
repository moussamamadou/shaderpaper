<script setup lang="ts">
/**
 * Size or frame option: a native radio drawn as a tile, with a sub-line (the
 * price) and, for frames, a swatch of the moulding. States: off, on,
 * unavailable (disabled, struck through).
 */
const props = withDefaults(
  defineProps<{
    value: string
    name: string
    label: string
    sub?: string
    swatch?: string | null
    unavailable?: boolean
  }>(),
  { sub: '', swatch: null, unavailable: false },
)
const model = defineModel<string | null>({ default: null })
const id = `o-${useId()}`
const checked = computed(() => model.value === props.value)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      type="radio"
      :name="name"
      :value="value"
      :disabled="unavailable"
      class="peer sr-only"
    />
    <label
      :for="id"
      :class="[
        'flex h-full min-h-14 cursor-pointer items-center gap-3 rounded-xs border bg-surface px-3 py-2 transition-colors duration-fast peer-focus-visible:shadow-focus',
        checked ? 'border-ink shadow-[inset_0_0_0_1px_theme(colors.ink)]' : 'border-line hover:border-line-strong',
        unavailable ? 'cursor-not-allowed opacity-50' : '',
      ]"
    >
      <span
        v-if="swatch !== null"
        class="h-6 w-6 shrink-0 rounded-xs border border-line"
        :style="swatch ? { background: swatch } : { background: 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(17,17,17,0.12) 4px 5px)' }"
        aria-hidden="true"
      />
      <span class="flex min-w-0 flex-col">
        <span :class="['type-body-s font-medium text-ink', unavailable ? 'line-through' : '']">{{ label }}</span>
        <span v-if="sub" class="type-caption text-ink-3">{{ sub }}</span>
      </span>
    </label>
  </div>
</template>
