<script setup lang="ts">
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'
import { ChevronDown, Menu, Search, ShoppingBag, User } from 'lucide-vue-next'

/**
 * Site header. Desktop (lg+): wordmark, Shop / Collections ▾ / 3D & material /
 * About, then search, account and cart. Mobile: menu button, wordmark, search
 * and cart; the menu opens <LayoutMobileMenu> (a drawer). The cart count is
 * the one signal-coloured element in the chrome.
 */
const cc = useCountryCode()
const { cart } = useCart()
const drawer = useCartDrawer()
const mobileOpen = ref(false)
const { t } = useI18n()

const count = computed(() => cart.value?.items?.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 0)
const cartLabel = computed(() => t('header.cartWithCount', { n: count.value }))
const link = (p: string) => `/${cc.value}${p}`
const route = useRoute()
const isActive = (p: string) => route.path === link(p) || route.path.startsWith(`${link(p)}/`)

const searchOpen = ref(false)
const q = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const openSearch = async () => {
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}
const submitSearch = () => {
  searchOpen.value = false
  navigateTo({ path: link('/search'), query: q.value.trim() ? { q: q.value.trim() } : {} })
}
watch(() => route.fullPath, () => {
  searchOpen.value = false
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
    <a href="#main" class="sr-only-focusable absolute left-4 top-2 z-50 rounded-xs bg-ink px-4 py-2 text-paper">{{ $t('header.skip') }}</a>
    <div class="page flex h-14 items-center gap-2 lg:h-header lg:gap-8">
      <!-- mobile: menu -->
      <UiIconButton class="-ml-2 lg:hidden" :label="$t('header.openMenu')" @click="mobileOpen = true">
        <Menu :size="22" aria-hidden="true" />
      </UiIconButton>

      <NuxtLink :to="link('')" class="flex min-h-11 items-center max-lg:mx-auto" :aria-label="$t('header.home')">
        <LayoutWordmark />
      </NuxtLink>

      <!-- desktop nav -->
      <nav :aria-label="$t('header.primary')" class="hidden flex-1 items-center gap-1 lg:flex">
        <NuxtLink :to="link('/shop')" :class="['rounded-xs px-3 py-2 type-body-s font-medium hover:bg-sunken', isActive('/shop') ? 'text-ink underline decoration-2 underline-offset-8' : 'text-ink-2']">
          {{ $t('nav.shop') }}
        </NuxtLink>
        <DropdownMenuRoot :modal="false">
          <DropdownMenuTrigger
            :class="['inline-flex items-center gap-1 rounded-xs px-3 py-2 type-body-s font-medium hover:bg-sunken data-[state=open]:bg-sunken', isActive('/collections') ? 'text-ink' : 'text-ink-2']"
          >
            {{ $t('nav.collections') }}
            <ChevronDown :size="16" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              :side-offset="8"
              align="start"
              class="z-50 min-w-[240px] rounded-xs border border-line bg-surface p-1 shadow-overlay animate-fade-in"
            >
              <DropdownMenuItem v-for="c in CATEGORIES" :key="c.handle" as-child>
                <NuxtLink
                  :to="link(`/collections/${c.handle}`)"
                  class="flex min-h-10 cursor-pointer items-center rounded-xs px-3 type-body-s text-ink outline-none data-[highlighted]:bg-sunken"
                >
                  {{ $t(`categories.${c.handle}`) }}
                </NuxtLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <NuxtLink :to="link('/campaigns/material')" :class="['rounded-xs px-3 py-2 type-body-s font-medium hover:bg-sunken', isActive('/campaigns/material') ? 'text-ink' : 'text-ink-2']">
          {{ $t('nav.material') }}
        </NuxtLink>
        <NuxtLink :to="link('/about')" :class="['rounded-xs px-3 py-2 type-body-s font-medium hover:bg-sunken', isActive('/about') ? 'text-ink' : 'text-ink-2']">
          {{ $t('nav.about') }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-1 lg:gap-2">
        <form v-if="searchOpen" role="search" class="hidden items-center lg:flex" @submit.prevent="submitSearch">
          <label for="header-search" class="sr-only">{{ $t('search.label') }}</label>
          <input
            id="header-search"
            ref="searchInput"
            v-model="q"
            type="search"
            :placeholder="$t('search.placeholder')"
            class="h-10 w-[240px] rounded-xs border border-ink-3 bg-surface px-3 type-body-s focus:border-ink"
            @keydown.esc="searchOpen = false"
          />
        </form>
        <UiIconButton v-if="!searchOpen" class="hidden lg:inline-flex" :label="$t('search.label')" @click="openSearch">
          <Search :size="20" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton class="lg:hidden" :to="link('/search')" :label="$t('search.label')">
          <Search :size="20" aria-hidden="true" />
        </UiIconButton>
        <UiIconButton class="hidden lg:inline-flex" :to="link('/account')" :label="$t('nav.account')">
          <User :size="20" aria-hidden="true" />
        </UiIconButton>
        <button
          type="button"
          class="relative -mr-2 inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xs px-2 text-ink hover:bg-sunken lg:mr-0 lg:h-10"
          :aria-label="cartLabel"
          aria-haspopup="dialog"
          data-testid="cart-button"
          @click="drawer.open()"
        >
          <ShoppingBag :size="20" aria-hidden="true" />
          <span class="hidden type-body-s font-medium lg:inline">{{ $t('nav.cart') }}</span>
          <span
            v-if="count > 0"
            class="absolute right-0 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-signal px-1 type-caption text-on-signal lg:static lg:ml-0"
            aria-hidden="true"
            data-testid="cart-count"
          >{{ count }}</span>
        </button>
      </div>
    </div>
    <LayoutMobileMenu v-model:open="mobileOpen" />
  </header>
</template>
