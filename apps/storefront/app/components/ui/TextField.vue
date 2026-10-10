<script setup lang="ts">
import { Eye, EyeOff, CircleAlert } from 'lucide-vue-next'

/**
 * Labelled text input with hint and error. The error is announced through
 * aria-describedby and marks the field aria-invalid. Passwords get a
 * show/hide toggle. Other attributes (autocomplete, inputmode, maxlength…)
 * fall through to the <input>.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label: string
    name: string
    type?: string
    required?: boolean
    disabled?: boolean
    error?: string | null
    hint?: string
    optionalLabel?: boolean
  }>(),
  { type: 'text', required: false, disabled: false, error: null, hint: '', optionalLabel: false },
)

const model = defineModel<string>({ default: '' })
const uid = useId()
const id = computed(() => `f-${props.name.replace(/[^a-z0-9_-]/gi, '-')}-${uid}`)
const reveal = ref(false)
const inputType = computed(() => (props.type === 'password' && reveal.value ? 'text' : props.type))
const describedBy = computed(() =>
  [props.error ? `${id.value}-error` : '', props.hint ? `${id.value}-hint` : ''].filter(Boolean).join(' ') || undefined,
)
const input = ref<HTMLInputElement | null>(null)
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="flex items-baseline justify-between gap-2 type-body-s font-medium text-ink">
      <span>
        {{ label }}<span v-if="required" class="text-ink-3" aria-hidden="true"> *</span>
      </span>
      <span v-if="optionalLabel && !required" class="type-caption text-ink-3">{{ $t('form.optional') }}</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        ref="input"
        v-model="model"
        v-bind="$attrs"
        :name="name"
        :type="inputType"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        :class="[
          'h-12 w-full rounded-xs border bg-surface px-4 type-body text-ink transition-colors duration-fast placeholder:text-ink-3',
          'hover:border-ink-2 focus:border-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-ink-3',
          error ? 'border-danger' : 'border-ink-3',
          type === 'password' ? 'pr-12' : '',
        ]"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-ink-2 hover:text-ink"
        :aria-label="reveal ? $t('form.hidePassword') : $t('form.showPassword')"
        :aria-pressed="reveal"
        @click="reveal = !reveal"
      >
        <EyeOff v-if="reveal" :size="18" aria-hidden="true" />
        <Eye v-else :size="18" aria-hidden="true" />
      </button>
    </div>
    <p v-if="hint && !error" :id="`${id}-hint`" class="type-body-s text-ink-3">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="flex items-start gap-1 type-body-s text-danger">
      <CircleAlert :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
