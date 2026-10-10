<script setup lang="ts">
/**
 * Info page frame: breadcrumb, title, lede, a side list of the other info
 * pages on desktop, and the body. Body content states known facts only; the
 * rest is <InfoTbw> blocks.
 */
const props = defineProps<{ title: string; lede?: string; current: string }>()
const cc = useCountryCode()
const { t } = useI18n()
const pages = ['about', 'contact', 'faq', 'shipping', 'returns', 'privacy', 'terms']
useSeoMeta({ title: () => props.title, description: () => props.lede ?? '' })
</script>

<template>
  <div class="page pb-24 pt-6 lg:pt-10">
    <UiBreadcrumbs :items="[{ label: t('nav.home'), to: '/' }, { label: title }]" />
    <div class="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-6">
      <nav class="order-last lg:order-first lg:col-span-3" :aria-label="$t('info.nav')">
        <ul class="flex flex-wrap gap-2 lg:sticky lg:top-[96px] lg:flex-col lg:gap-1">
          <li v-for="p in pages" :key="p">
            <NuxtLink
              :to="`/${cc}/${p}`"
              :aria-current="p === current ? 'page' : undefined"
              :class="[
                'inline-flex min-h-11 items-center rounded-xs px-3 type-body-s lg:flex',
                p === current ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:text-ink lg:border-0 lg:hover:bg-sunken',
              ]"
            >
              {{ $t(`info.${p}.title`) }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <article class="flex max-w-prose flex-col gap-6 lg:col-span-8 lg:col-start-5">
        <header class="flex flex-col gap-3">
          <h1 class="type-display-l">{{ title }}</h1>
          <p v-if="lede" class="type-body-l text-ink-2">{{ lede }}</p>
        </header>
        <slot />
      </article>
    </div>
  </div>
</template>
