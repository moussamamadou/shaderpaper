<script setup lang="ts">
import { FlaskConical, Info, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-vue-next'

/**
 * Inline banner. `test` is the test-mode banner (no payment is taken),
 * deliberately loud: warning colours and a mono label.
 */
const props = withDefaults(defineProps<{ tone?: 'test' | 'info' | 'warning' | 'danger' | 'success'; title: string; live?: boolean }>(), {
  tone: 'info',
  live: false,
})
const icon = computed(() => ({ test: FlaskConical, info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck })[props.tone])
</script>

<template>
  <div
    :role="live ? (tone === 'danger' ? 'alert' : 'status') : 'note'"
    :class="[
      'flex items-start gap-3 rounded-xs border px-4 py-3',
      {
        test: 'border-warning bg-warning-bg text-ink',
        info: 'border-info/30 bg-info-bg text-ink',
        warning: 'border-warning/40 bg-warning-bg text-ink',
        danger: 'border-danger/40 bg-danger-bg text-ink',
        success: 'border-success/40 bg-success-bg text-ink',
      }[tone],
    ]"
  >
    <component
      :is="icon"
      :size="20"
      :class="['mt-0.5 shrink-0', { test: 'text-warning', info: 'text-info', warning: 'text-warning', danger: 'text-danger', success: 'text-success' }[tone]]"
      aria-hidden="true"
    />
    <div class="flex min-w-0 flex-col gap-1">
      <p :class="tone === 'test' ? 'type-label text-warning' : 'type-body-s font-medium'">{{ title }}</p>
      <div v-if="$slots.default" class="type-body-s text-ink-2"><slot /></div>
    </div>
  </div>
</template>
