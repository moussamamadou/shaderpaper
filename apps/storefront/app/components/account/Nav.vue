<script setup lang="ts">
import { LogOut } from 'lucide-vue-next'

/** Account navigation: a column on desktop, a scrolling row on phones. */
const cc = useCountryCode()
const route = useRoute()
const { logout } = useCustomer()
const { t } = useI18n()
const links = computed(() => [
  { to: `/${cc.value}/account`, label: t('account.overview'), exact: true },
  { to: `/${cc.value}/account/orders`, label: t('account.orders'), exact: false },
  { to: `/${cc.value}/account/addresses`, label: t('account.addresses'), exact: true },
  { to: `/${cc.value}/account/profile`, label: t('account.profile'), exact: true },
])
const isActive = (l: { to: string; exact: boolean }) => (l.exact ? route.path === l.to : route.path.startsWith(l.to))
const signingOut = ref(false)
const signOut = async () => {
  signingOut.value = true
  try {
    await logout(cc.value)
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <nav :aria-label="$t('account.nav')">
    <ul class="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      <li v-for="l in links" :key="l.to" class="shrink-0">
        <NuxtLink
          :to="l.to"
          :aria-current="isActive(l) ? 'page' : undefined"
          :class="[
            'flex min-h-11 items-center rounded-xs px-3 type-body-s transition-colors duration-fast',
            isActive(l) ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunken hover:text-ink',
          ]"
        >
          {{ l.label }}
        </NuxtLink>
      </li>
      <li class="shrink-0 lg:mt-4 lg:border-t lg:border-line lg:pt-4">
        <button type="button" class="flex min-h-11 items-center gap-2 rounded-xs px-3 type-body-s text-ink-2 hover:bg-sunken hover:text-ink" :disabled="signingOut" data-testid="sign-out" @click="signOut">
          <LogOut :size="16" aria-hidden="true" />{{ $t('account.signOut') }}
        </button>
      </li>
    </ul>
  </nav>
</template>
