<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

/**
 * Night footer. Desktop: wordmark and line, three link columns. Mobile: the
 * columns fold into disclosures (native <details>, keyboard-operable).
 */
const cc = useCountryCode()
const link = (p: string) => `/${cc.value}${p}`
const columns = computed(() => [
  {
    key: 'shop',
    links: [
      { to: '/shop', key: 'nav.shopAll' },
      ...CATEGORIES.map((c) => ({ to: `/collections/${c.handle}`, key: `categories.${c.handle}` })),
    ],
  },
  {
    key: 'help',
    links: [
      { to: '/shipping', key: 'nav.shipping' },
      { to: '/returns', key: 'nav.returns' },
      { to: '/faq', key: 'nav.faq' },
      { to: '/contact', key: 'nav.contact' },
      { to: '/account', key: 'nav.account' },
    ],
  },
  {
    key: 'company',
    links: [
      { to: '/about', key: 'nav.about' },
      { to: '/privacy', key: 'nav.privacy' },
      { to: '/terms', key: 'nav.terms' },
    ],
  },
])
</script>

<template>
  <footer class="mt-24 bg-night text-on-night">
    <div class="page grid-page gap-y-10 py-12 lg:py-20">
      <div class="col-span-4 flex flex-col gap-4 md:col-span-8 lg:col-span-4">
        <LayoutWordmark tone="night" />
        <p class="max-w-[36ch] type-body-s text-on-night-2">{{ $t('footer.line') }}</p>
      </div>
      <!-- desktop / tablet columns -->
      <div
        v-for="col in columns"
        :key="col.key"
        class="hidden md:col-span-2 md:block lg:col-span-2"
        :class="col.key === 'shop' ? 'md:col-span-4 lg:col-start-6 lg:col-span-3' : ''"
      >
        <h2 class="type-label text-on-night-2">{{ $t(`footer.${col.key}`) }}</h2>
        <ul :class="['mt-4 grid gap-x-6', col.key === 'shop' ? 'grid-cols-2' : '']">
          <li v-for="l in col.links" :key="l.to">
            <NuxtLink :to="link(l.to)" class="inline-flex min-h-8 items-center type-body-s text-on-night hover:underline hover:underline-offset-4">
              {{ $t(l.key) }}
            </NuxtLink>
          </li>
        </ul>
      </div>
      <!-- mobile disclosures -->
      <div class="col-span-4 border-t border-night-2 md:hidden">
        <details v-for="col in columns" :key="col.key" class="group border-b border-night-2">
          <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between type-label text-on-night [&::-webkit-details-marker]:hidden">
            {{ $t(`footer.${col.key}`) }}
            <ChevronDown :size="18" class="transition-transform duration-base group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul class="pb-4">
            <li v-for="l in col.links" :key="l.to">
              <NuxtLink :to="link(l.to)" class="flex min-h-11 items-center type-body text-on-night-2 hover:text-on-night">{{ $t(l.key) }}</NuxtLink>
            </li>
          </ul>
        </details>
      </div>
    </div>
    <div class="border-t border-night-2">
      <div class="page flex flex-col gap-2 py-6 type-caption text-on-night-2 md:flex-row md:items-center md:justify-between">
        <p>{{ $t('footer.small', { year: new Date().getFullYear() }) }}</p>
        <p>{{ $t('footer.madeToOrder') }}</p>
      </div>
    </div>
  </footer>
</template>
