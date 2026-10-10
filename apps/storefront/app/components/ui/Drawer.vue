<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'

/**
 * Side sheet (a reka-ui dialog): focus trap, Escape to close, focus back to
 * the opener. Full width on phones, 440 px (tokens.layout.drawerWidth) from sm.
 */
withDefaults(defineProps<{ title: string; description?: string; side?: 'right' | 'left' }>(), { description: '', side: 'right' })
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-scrim animate-fade-in" />
      <DialogContent
        :class="[
          'fixed inset-y-0 z-50 flex w-full flex-col bg-paper shadow-overlay sm:w-drawer',
          side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-fade-in',
        ]"
      >
        <div class="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line pl-4 pr-2 md:h-header md:pl-6 md:pr-4">
          <div class="flex min-w-0 flex-col">
            <DialogTitle class="type-h3 text-ink">{{ title }}</DialogTitle>
            <DialogDescription :class="description ? 'type-caption text-ink-3' : 'sr-only'">{{ description || title }}</DialogDescription>
          </div>
          <DialogClose as-child>
            <UiIconButton :label="$t('common.close')"><X :size="20" aria-hidden="true" /></UiIconButton>
          </DialogClose>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 border-t border-line bg-surface px-4 py-4 md:px-6">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
