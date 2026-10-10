<script setup lang="ts" generic="T extends string | number">
/**
 * Mutually exclusive options in one bar. Built from native radios (sr-only),
 * so Tab enters the group, arrow keys move the choice, and each option is
 * announced with the group's legend.
 */
withDefaults(
  defineProps<{
    legend: string
    options: { value: T; label: string }[]
    hideLegend?: boolean
    size?: 'sm' | 'md'
    /** Many options: lay them out on a grid of three columns instead of one bar. */
    wrap?: boolean
  }>(),
  { hideLegend: false, size: 'md', wrap: false },
)
const model = defineModel<T | null>({ default: null })
const name = `seg-${useId()}`
</script>

<template>
  <fieldset class="min-w-0">
    <legend :class="hideLegend ? 'sr-only' : 'mb-2 type-body-s font-medium text-ink'">{{ legend }}</legend>
    <div :class="['w-full rounded-xs border border-line bg-surface p-0.5', wrap ? 'grid grid-cols-3 gap-0.5' : 'flex']">
      <div v-for="o in options" :key="String(o.value)" class="relative min-w-0 flex-1">
        <input
          :id="`${name}-${o.value}`"
          v-model="model"
          type="radio"
          :name="name"
          :value="o.value"
          class="peer sr-only"
        />
        <label
          :for="`${name}-${o.value}`"
          :class="[
            'flex h-full cursor-pointer items-center justify-center truncate rounded-xs px-2 text-center type-body-s transition-colors duration-fast peer-focus-visible:shadow-focus',
            size === 'sm' ? 'min-h-11 md:min-h-8' : 'min-h-11',
            model === o.value ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunken hover:text-ink',
          ]"
        >
          {{ o.label }}
        </label>
      </div>
    </div>
  </fieldset>
</template>
