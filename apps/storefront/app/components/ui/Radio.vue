<script setup lang="ts" generic="T extends string">
/**
 * One option of a radio group, drawn as a card row: native radio input
 * (so arrow keys move within the group), label, optional description and an
 * aside (a price, an icon). Give every option of a group the same `name`.
 */
const props = withDefaults(
  defineProps<{ value: T; name: string; label: string; description?: string; disabled?: boolean }>(),
  { description: '', disabled: false },
)
const model = defineModel<T | null>({ default: null })
const id = `r-${useId()}`
const checked = computed(() => model.value === props.value)
</script>

<template>
  <label
    :for="id"
    :class="[
      'flex min-h-14 cursor-pointer items-center gap-4 rounded-xs border bg-surface px-4 py-3 transition-colors duration-fast',
      checked ? 'border-ink' : 'border-line hover:border-line-strong',
      disabled ? 'cursor-not-allowed opacity-50' : '',
    ]"
  >
    <input
      :id="id"
      v-model="model"
      type="radio"
      :name="name"
      :value="value"
      :disabled="disabled"
      class="h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-pill border border-line-strong bg-surface transition-[border-width,border-color] duration-fast checked:border-[6px] checked:border-ink"
    />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="type-body font-medium text-ink">{{ label }}</span>
      <span v-if="description" class="type-body-s text-ink-3">{{ description }}</span>
      <slot name="extra" />
    </span>
    <span v-if="$slots.aside" class="shrink-0 text-right"><slot name="aside" /></span>
  </label>
</template>
