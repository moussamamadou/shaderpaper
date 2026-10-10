<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

/** Tabs (reka-ui: roving focus with arrow keys, aria-selected). Each panel is the slot named after its value. */
withDefaults(defineProps<{ tabs: { value: string; label: string }[]; label: string; stretch?: boolean }>(), { stretch: false })
const model = defineModel<string>({ required: true })
</script>

<template>
  <TabsRoot v-model="model" class="flex flex-col">
    <TabsList :aria-label="label" class="relative flex border-b border-line">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        :class="[
          'min-h-11 px-4 type-label text-ink-3 transition-colors duration-fast hover:text-ink data-[state=active]:text-ink',
          stretch ? 'flex-1' : '',
        ]"
      >
        {{ tab.label }}
      </TabsTrigger>
      <TabsIndicator class="absolute bottom-0 left-0 h-0.5 w-[--reka-tabs-indicator-size] translate-x-[--reka-tabs-indicator-position] bg-ink transition-[width,transform] duration-base" />
    </TabsList>
    <TabsContent v-for="tab in tabs" :key="tab.value" :value="tab.value" class="pt-5 focus-visible:shadow-none">
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>
