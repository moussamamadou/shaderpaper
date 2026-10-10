<script setup lang="ts">
/**
 * One palette as a pill of colour stripes. Used inside a radiogroup: it is a
 * native radio (sr-only) with the swatch as its label, so arrow keys move
 * between palettes and the name is read out.
 */
const props = defineProps<{ colors: string[]; label: string; value: number; name: string }>()
const model = defineModel<number | null>({ default: null })
const id = `pal-${useId()}`
const checked = computed(() => model.value === props.value)
</script>

<template>
  <div class="relative">
    <input :id="id" v-model="model" type="radio" class="peer sr-only" :name="name" :value="value" />
    <label
      :for="id"
      :title="label"
      :class="[
        'flex h-11 cursor-pointer items-center rounded-pill border-2 p-0.5 transition-colors duration-fast peer-focus-visible:shadow-focus md:h-10',
        checked ? 'border-ink' : 'border-transparent hover:border-line-strong',
      ]"
    >
      <span class="flex h-full overflow-hidden rounded-pill shadow-[inset_0_0_0_1px_rgba(17,17,17,0.12)]">
        <span v-for="(c, i) in colors.slice(0, 6)" :key="i" class="block h-full w-3" :style="{ background: c }" />
      </span>
      <span class="sr-only">{{ label }}</span>
    </label>
  </div>
</template>
