<script setup lang="ts">
import { PencilLine } from 'lucide-vue-next'

/**
 * "To be written — needs business input": stands where a policy, a promise or
 * a figure would go that the business has not given yet. Never filled with
 * invented text. `what` says what is missing, so the gap is actionable.
 */
withDefaults(defineProps<{ what: string; compact?: boolean }>(), { compact: false })
</script>

<template>
  <div :class="['tbw flex gap-3', compact ? 'p-4' : '']" data-testid="tbw">
    <PencilLine :size="18" class="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-1">
      <p class="type-label text-warning">{{ $t('tbw.label') }}</p>
      <p class="type-body-s text-ink-2">{{ what }}</p>
      <div v-if="$slots.default" class="type-body-s text-ink-2"><slot /></div>
    </div>
  </div>
</template>
