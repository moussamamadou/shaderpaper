<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

/** The mobile navigation, in a left drawer (focus trapped, Escape closes). Closes on navigation. */
const open = defineModel<boolean>('open', { default: false })
const cc = useCountryCode()
const route = useRoute()
const link = (p: string) => `/${cc.value}${p}`
watch(() => route.fullPath, () => {
  open.value = false
})
const big = 'flex min-h-14 items-center justify-between border-b border-line py-3 type-h3 text-ink'
const small = 'flex min-h-11 items-center type-body text-ink-2 hover:text-ink'
</script>

<template>
  <UiDrawer v-model:open="open" side="left" :title="$t('header.menu')">
    <nav :aria-label="$t('header.primary')" class="flex flex-col px-4 pb-8 pt-2">
      <NuxtLink :to="link('/shop')" :class="big">{{ $t('nav.shopAll') }}<ArrowRight :size="20" aria-hidden="true" /></NuxtLink>
      <NuxtLink :to="link('/campaigns/material')" :class="big">
        <span class="flex items-center gap-2">{{ $t('nav.material') }} <UiBadge tone="new">{{ $t('common.new') }}</UiBadge></span>
        <ArrowRight :size="20" aria-hidden="true" />
      </NuxtLink>
      <p class="mt-6 eyebrow">{{ $t('nav.collections') }}</p>
      <ul class="mt-2 grid grid-cols-2 gap-x-3">
        <li v-for="c in CATEGORIES" :key="c.handle">
          <NuxtLink :to="link(`/collections/${c.handle}`)" :class="small">{{ $t(`categories.${c.handle}`) }}</NuxtLink>
        </li>
      </ul>
      <p class="mt-6 eyebrow">{{ $t('nav.help') }}</p>
      <ul class="mt-2 grid grid-cols-2 gap-x-3">
        <li><NuxtLink :to="link('/account')" :class="small">{{ $t('nav.account') }}</NuxtLink></li>
        <li><NuxtLink :to="link('/about')" :class="small">{{ $t('nav.about') }}</NuxtLink></li>
        <li><NuxtLink :to="link('/faq')" :class="small">{{ $t('nav.faq') }}</NuxtLink></li>
        <li><NuxtLink :to="link('/shipping')" :class="small">{{ $t('nav.shipping') }}</NuxtLink></li>
        <li><NuxtLink :to="link('/returns')" :class="small">{{ $t('nav.returns') }}</NuxtLink></li>
        <li><NuxtLink :to="link('/contact')" :class="small">{{ $t('nav.contact') }}</NuxtLink></li>
      </ul>
    </nav>
  </UiDrawer>
</template>
