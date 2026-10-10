<script setup lang="ts">
import { ChevronDown, CircleAlert } from 'lucide-vue-next'

/** Labelled native <select> (keyboard and screen-reader behaviour for free). */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label: string
    name: string
    options: { value: string; label: string }[]
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string | null
    hideLabel?: boolean
  }>(),
  { placeholder: '', required: false, disabled: false, error: null, hideLabel: false },
)

const model = defineModel<string>({ default: '' })
const uid = useId()
const id = computed(() => `s-${props.name.replace(/[^a-z0-9_-]/gi, '-')}-${uid}`)
const select = ref<HTMLSelectElement | null>(null)
defineExpose({ focus: () => select.value?.focus() })
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" :class="['type-body-s font-medium text-ink', hideLabel ? 'sr-only' : '']">
      {{ label }}<span v-if="required" class="text-ink-3" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <select
        :id="id"
        ref="select"
        v-model="model"
        v-bind="$attrs"
        :name="name"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        :class="[
          'h-12 w-full cursor-pointer appearance-none rounded-xs border bg-surface pl-4 pr-10 type-body text-ink transition-colors duration-fast',
          'hover:border-ink-2 focus:border-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken',
          error ? 'border-danger' : 'border-ink-3',
          !model ? 'text-ink-3' : '',
        ]"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <ChevronDown :size="18" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden="true" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="flex items-start gap-1 type-body-s text-danger">
      <CircleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
