<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'
import { Plus } from 'lucide-vue-next'

/**
 * Accordion (reka-ui: buttons with aria-expanded/aria-controls, arrow keys
 * between headers). Each item's body is the slot named after its value.
 */
withDefaults(
  defineProps<{ items: { value: string; title: string }[]; multiple?: boolean; defaultValue?: string[]; headingLevel?: 'h2' | 'h3' }>(),
  { multiple: true, defaultValue: () => [], headingLevel: 'h3' },
)
</script>

<template>
  <AccordionRoot :type="multiple ? 'multiple' : 'single'" :default-value="multiple ? defaultValue : defaultValue[0]" collapsible class="border-t border-line">
    <AccordionItem v-for="item in items" :key="item.value" :value="item.value" class="border-b border-line">
      <AccordionHeader :as="headingLevel" class="m-0">
        <AccordionTrigger
          class="group flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left type-body font-medium text-ink"
        >
          {{ item.title }}
          <Plus :size="18" class="shrink-0 transition-transform duration-base group-data-[state=open]:rotate-45" aria-hidden="true" />
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden">
        <div class="pb-5 type-body-s text-ink-2">
          <slot :name="item.value" />
        </div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
