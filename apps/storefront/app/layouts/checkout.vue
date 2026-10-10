<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

/** Checkout shell: no navigation to leave by accident; back to cart and the wordmark. */
useCanonical()
const cc = useCountryCode()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-paper">
    <header class="border-b border-line bg-paper">
      <div class="page flex h-14 items-center justify-between gap-4 lg:h-header">
        <NuxtLink :to="`/${cc}/cart`" class="inline-flex min-h-11 flex-1 basis-0 items-center gap-1 type-body-s text-ink-2 hover:text-ink" data-testid="back-to-cart-link">
          <ChevronLeft :size="18" aria-hidden="true" />
          <span class="hidden sm:inline">{{ $t('checkout.backToCart') }}</span>
          <span class="sm:hidden">{{ $t('common.back') }}</span>
        </NuxtLink>
        <NuxtLink :to="`/${cc}`" class="flex min-h-11 items-center" :aria-label="$t('header.home')">
          <LayoutWordmark />
        </NuxtLink>
        <p class="hidden flex-1 basis-0 justify-end type-caption text-ink-3 sm:flex">{{ $t('checkout.title') }}</p>
        <div class="flex-1 basis-0 sm:hidden" />
      </div>
    </header>
    <main id="main" tabindex="-1" class="flex-1 focus-visible:shadow-none">
      <slot />
    </main>
    <footer class="border-t border-line py-6">
      <p class="page type-caption text-ink-3">{{ $t('footer.small', { year: new Date().getFullYear() }) }}</p>
    </footer>
    <LayoutToasts />
  </div>
</template>
