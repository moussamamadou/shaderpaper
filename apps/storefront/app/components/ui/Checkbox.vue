<script setup lang="ts">
import { Check } from 'lucide-vue-next'

/** Native checkbox with a custom box; the whole row (≥ 44 px) is the label. */
const props = withDefaults(defineProps<{ label: string; name?: string; disabled?: boolean; description?: string }>(), {
  name: undefined,
  disabled: false,
  description: '',
})
const model = defineModel<boolean>({ default: false })
const id = `c-${useId()}`
</script>

<template>
  <label :for="id" :class="['group flex min-h-11 cursor-pointer items-start gap-3 py-2', disabled ? 'cursor-not-allowed opacity-50' : '']">
    <span class="relative mt-0.5 flex h-5 w-5 shrink-0">
      <input
        :id="id"
        v-model="model"
        type="checkbox"
        :name="props.name"
        :disabled="disabled"
        class="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-xs border border-line-strong bg-surface transition-colors duration-fast checked:border-ink checked:bg-ink group-hover:border-ink"
      />
      <Check :size="14" :stroke-width="3" class="pointer-events-none absolute left-0.5 top-0.5 hidden text-paper peer-checked:block" aria-hidden="true" />
    </span>
    <span class="flex flex-col gap-1">
      <span class="type-body text-ink">{{ label }}</span>
      <span v-if="description" class="type-body-s text-ink-3">{{ description }}</span>
    </span>
  </label>
</template>
