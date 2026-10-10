<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * 404 and 500. A 404 under a country (/fr/…) renders inside the site chrome
 * (header, footer), the checkout path inside the checkout shell, as in
 * MapAndSky. Other errors render bare: the chrome refetches the cart and the
 * customer, which is often what failed.
 */
const props = defineProps<{ error: NuxtError }>()
const route = useRoute()
const { t } = useI18n()
const is404 = computed(() => props.error?.statusCode === 404)
const path = computed(() => ((props.error?.data as { path?: string } | undefined)?.path ?? route.path ?? '/') as string)
const country = computed(() => path.value.match(/^\/([a-z]{2})(?:\/|$)/)?.[1] ?? null)
const withChrome = computed(() => is404.value && !!country.value)
const layout = computed(() => (/^\/[^/]+\/checkout(?:\/|$)/.test(path.value) ? 'checkout' : 'default'))
const home = computed(() => (country.value ? `/${country.value}` : '/'))

const title = computed(() => (is404.value ? t('errors.notFoundTitle') : t('errors.serverTitle')))
const body = computed(() =>
  is404.value ? props.error?.statusMessage && props.error.statusMessage !== 'Page Not Found' ? props.error.statusMessage : t('errors.notFoundBody') : t('errors.serverBody'),
)
useSeoMeta({ title: () => (is404.value ? t('errors.notFoundMeta') : t('errors.serverMeta')), robots: 'noindex' })
const retry = () => clearError({ redirect: route.fullPath })
const goHome = () => clearError({ redirect: home.value })
</script>

<template>
  <NuxtLayout v-if="withChrome" :name="layout">
    <div class="page flex min-h-[60vh] flex-col items-start justify-center gap-5 py-20" data-testid="error-page">
      <p class="type-label text-ink-3">{{ $t('errors.code', { code: error.statusCode }) }}</p>
      <h1 class="type-display-l">{{ title }}</h1>
      <p class="max-w-prose type-body-l text-ink-2">{{ body }}</p>
      <div class="flex flex-wrap gap-3">
        <UiButton :to="home">{{ $t('errors.goHome') }}</UiButton>
        <UiButton :to="`${home === '/' ? '' : home}/shop`" variant="secondary">{{ $t('errors.goShop') }}</UiButton>
      </div>
    </div>
  </NuxtLayout>
  <div v-else class="flex min-h-dvh flex-col bg-paper text-ink" data-testid="error-page">
    <header class="page flex h-14 items-center lg:h-header">
      <a :href="home" class="flex min-h-11 items-center" :aria-label="$t('header.home')" @click.prevent="goHome"><LayoutWordmark /></a>
    </header>
    <main id="main" class="page flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <p class="type-label text-ink-3">{{ $t('errors.code', { code: error.statusCode }) }}</p>
      <h1 class="type-display-l">{{ title }}</h1>
      <p class="max-w-prose type-body-l text-ink-2">{{ body }}</p>
      <div class="flex flex-wrap gap-3">
        <UiButton v-if="!is404" @click="retry">{{ $t('errors.retry') }}</UiButton>
        <UiButton :variant="is404 ? 'primary' : 'secondary'" @click="goHome">{{ $t('errors.goHome') }}</UiButton>
      </div>
    </main>
  </div>
</template>
