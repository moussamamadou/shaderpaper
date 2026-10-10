<script setup lang="ts">
import { NuxtLink } from '#components'

/** A square icon-only button (44 px on touch, 40 px from md). `label` is its accessible name. */
const props = withDefaults(
  defineProps<{
    label: string
    to?: string
    variant?: 'ghost' | 'outline' | 'night'
    type?: 'button' | 'submit'
    disabled?: boolean
    pressed?: boolean
  }>(),
  { variant: 'ghost', type: 'button', disabled: false, pressed: undefined },
)

const classes = computed(() => [
  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xs transition-colors duration-fast md:h-10 md:w-10',
  props.variant === 'outline'
    ? 'border border-line bg-surface text-ink hover:border-ink'
    : props.variant === 'night'
      ? 'text-on-night hover:bg-night-2'
      : 'text-ink hover:bg-sunken',
  props.disabled ? 'pointer-events-none opacity-40' : '',
])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :aria-label="label" :title="label">
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    :aria-pressed="pressed"
  >
    <slot />
  </button>
</template>
