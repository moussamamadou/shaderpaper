<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from 'lucide-vue-next'

/**
 * Toast region. Two live regions are always in the DOM (polite and
 * assertive), so screen readers hear a toast as soon as it is added. Each
 * toast stays 5 s, paused while hovered or focused.
 */
const { toasts, dismiss } = useToast()
const cc = useCountryCode()
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const arm = (id: number) => {
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => dismiss(id), 5000))
}
const hold = (id: number) => clearTimeout(timers.get(id))
watch(
  () => toasts.value.map((t) => t.id),
  (ids, old) => {
    for (const id of ids) if (!old?.includes(id)) arm(id)
  },
)
onBeforeUnmount(() => timers.forEach((t) => clearTimeout(t)))
const polite = computed(() => toasts.value.filter((t) => t.tone !== 'error'))
const assertive = computed(() => toasts.value.filter((t) => t.tone === 'error'))
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:left-auto sm:right-0 sm:top-16 sm:items-end">
    <template v-for="group in [{ list: polite, live: 'polite' as const }, { list: assertive, live: 'assertive' as const }]" :key="group.live">
      <div :aria-live="group.live" :role="group.live === 'assertive' ? 'alert' : 'status'" class="flex w-full flex-col items-center gap-2 sm:items-end">
        <div
          v-for="t in group.list"
          :key="t.id"
          class="pointer-events-auto flex w-full max-w-[400px] items-start gap-3 rounded-xs border border-line bg-surface p-4 shadow-overlay animate-rise-in"
          @mouseenter="hold(t.id)"
          @mouseleave="arm(t.id)"
          @focusin="hold(t.id)"
          @focusout="arm(t.id)"
        >
          <CircleCheck v-if="t.tone === 'success'" :size="20" class="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <CircleAlert v-else-if="t.tone === 'error'" :size="20" class="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          <Info v-else :size="20" class="mt-0.5 shrink-0 text-info" aria-hidden="true" />
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <p class="type-body-s font-medium text-ink">{{ t.title }}</p>
            <p v-if="t.body" class="type-body-s text-ink-2">{{ t.body }}</p>
            <NuxtLink v-if="t.action" :to="`/${cc}${t.action.to}`" class="link mt-1 type-body-s">{{ t.action.label }}</NuxtLink>
          </div>
          <UiIconButton :label="$t('common.dismiss')" class="-mr-2 -mt-2" @click="dismiss(t.id)">
            <X :size="18" aria-hidden="true" />
          </UiIconButton>
        </div>
      </div>
    </template>
  </div>
</template>
