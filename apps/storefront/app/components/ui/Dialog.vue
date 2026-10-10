<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'

/**
 * Modal dialog (reka-ui): focus is trapped inside while open, Escape and the
 * close button close it, focus returns to the opener, and the page behind is
 * inert. `v-model:open` controls it.
 */
withDefaults(defineProps<{ title: string; description?: string; size?: 'sm' | 'md' | 'lg' }>(), { description: '', size: 'md' })
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-scrim animate-fade-in" />
      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xs bg-paper shadow-overlay animate-rise-in',
          { sm: 'max-w-[400px]', md: 'max-w-[560px]', lg: 'max-w-[760px]' }[size],
        ]"
      >
        <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
          <div class="flex flex-col gap-1">
            <DialogTitle class="type-h3 text-ink">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="type-body-s text-ink-2">{{ description }}</DialogDescription>
          </div>
          <DialogClose as-child>
            <UiIconButton :label="$t('common.close')"><X :size="20" aria-hidden="true" /></UiIconButton>
          </DialogClose>
        </div>
        <div class="overflow-y-auto px-5 py-5 md:px-6">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4 md:px-6">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
