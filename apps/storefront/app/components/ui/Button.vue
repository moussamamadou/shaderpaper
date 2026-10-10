<script setup lang="ts">
import { NuxtLink } from '#components'

/**
 * Button: primary (ink), secondary (outlined), ghost, link × sm, md, lg.
 * Renders a NuxtLink when `to` is set. While `loading` it keeps its width,
 * shows a spinner, and is aria-busy and unclickable. Touch targets are at
 * least 44 px tall below md.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'link' | 'night'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
    to?: string | Record<string, unknown>
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
)

const classes = computed(() => {
  const base =
    'relative inline-flex select-none items-center justify-center gap-2 rounded-xs type-button transition-colors duration-fast ease whitespace-nowrap'
  const sizes = {
    sm: 'h-11 px-3 md:h-8',
    md: 'h-11 px-5',
    lg: 'h-12 px-6',
  }
  const variants = {
    primary: 'bg-ink text-paper hover:bg-night-2 active:bg-ink',
    secondary: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
    ghost: 'bg-transparent text-ink hover:bg-sunken',
    link: 'h-auto px-0 bg-transparent text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink',
    night: 'bg-paper text-ink hover:bg-white',
  }
  return [
    base,
    props.variant === 'link' ? 'min-h-11 md:min-h-0' : sizes[props.size],
    variants[props.variant],
    props.block ? 'w-full' : '',
    props.disabled || props.loading ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer',
  ]
})
</script>

<template>
  <NuxtLink
    v-if="to && !disabled"
    :to="to"
    :class="classes"
    :aria-busy="loading || undefined"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <UiSpinner :size="18" />
    </span>
    <span :class="['inline-flex items-center gap-2', loading ? 'invisible' : '']">
      <slot />
    </span>
    <span v-if="loading" class="sr-only">{{ $t('common.loading') }}</span>
  </button>
</template>
