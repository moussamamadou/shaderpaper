<script setup lang="ts">
/**
 * A continuous poster knob: a native range input (0–100) with the knob's
 * name, its value, and the labels of both ends. `null` means the variation
 * (seed) decides: the thumb rests at the knob's default, hollow, and the
 * value reads "Auto" until the buyer moves it.
 */
const props = withDefaults(
  defineProps<{ label: string; modelValue: number | null; restValue?: number; lo?: string; hi?: string }>(),
  { restValue: 0.5, lo: '', hi: '' },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const id = `k-${useId()}`
const auto = computed(() => props.modelValue == null)
const shown = computed(() => Math.round((props.modelValue ?? props.restValue) * 100))
const onInput = (e: Event) => emit('update:modelValue', Number((e.target as HTMLInputElement).value) / 100)
const { t } = useI18n()
const valueText = computed(() =>
  auto.value ? t('customiser.autoLong') : props.lo && props.hi ? t('customiser.valueBetween', { value: shown.value, lo: props.lo, hi: props.hi }) : String(shown.value),
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="id" class="type-body-s font-medium text-ink">{{ label }}</label>
      <span :class="['type-caption tabular-nums', auto ? 'text-ink-3' : 'text-ink']" aria-hidden="true">
        {{ auto ? $t('customiser.auto') : shown }}
      </span>
    </div>
    <input
      :id="id"
      type="range"
      min="0"
      max="100"
      step="1"
      :value="shown"
      :aria-valuetext="valueText"
      :class="['sp-range w-full', auto ? 'is-auto' : '']"
      :style="{ '--fill': `${shown}%` }"
      @input="onInput"
    />
    <div v-if="lo || hi" class="flex justify-between type-caption text-ink-3" aria-hidden="true">
      <span>{{ lo }}</span><span>{{ hi }}</span>
    </div>
  </div>
</template>

<style scoped>
.sp-range {
  -webkit-appearance: none;
  appearance: none;
  height: 44px;
  background: transparent;
  cursor: pointer;
  margin: -12px 0;
}
@media (min-width: 768px) {
  .sp-range {
    height: 28px;
    margin: -6px 0;
  }
}
.sp-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(to right, theme('colors.ink') var(--fill), theme('colors.line') var(--fill));
}
.sp-range.is-auto::-webkit-slider-runnable-track {
  background: theme('colors.line');
}
.sp-range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: theme('colors.line');
}
.sp-range::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: theme('colors.ink');
}
.sp-range.is-auto::-moz-range-progress {
  background: transparent;
}
.sp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: -8px;
  border-radius: 999px;
  background: theme('colors.ink');
  border: 2px solid theme('colors.ink');
  box-shadow: 0 0 0 3px theme('colors.paper');
}
.sp-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: theme('colors.ink');
  border: 2px solid theme('colors.ink');
  box-shadow: 0 0 0 3px theme('colors.paper');
}
.sp-range.is-auto::-webkit-slider-thumb {
  background: theme('colors.paper');
}
.sp-range.is-auto::-moz-range-thumb {
  background: theme('colors.paper');
}
.sp-range:focus-visible {
  box-shadow: none;
}
.sp-range:focus-visible::-webkit-slider-thumb {
  box-shadow: theme('boxShadow.focus');
}
.sp-range:focus-visible::-moz-range-thumb {
  box-shadow: theme('boxShadow.focus');
}
</style>
