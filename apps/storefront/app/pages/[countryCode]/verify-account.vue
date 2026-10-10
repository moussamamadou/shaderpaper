<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next'

/**
 * Email verification link target (MapAndSky's verify-account). The token is
 * single-use, so it is confirmed once, in the browser only.
 */
const route = useRoute()
const cc = useCountryCode()
const { t } = useI18n()
const { verifyEmail } = useCustomer()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : null))
const { data: result, status } = await useAsyncData(
  'verify-account',
  async () => (token.value ? verifyEmail(token.value).catch(() => ({ success: false })) : { success: false }),
  { server: false, lazy: true },
)
const state = computed(() => (status.value === 'pending' || status.value === 'idle' ? 'verifying' : result.value?.success ? 'success' : 'error'))
useSeoMeta({ title: () => t('account.verifyTitle'), robots: 'noindex' })
</script>

<template>
  <div class="page flex max-w-[560px] flex-col items-center gap-4 py-24 text-center" role="status" aria-live="polite">
    <template v-if="state === 'verifying'">
      <UiSpinner :size="28" />
      <h1 class="type-h2">{{ $t('account.verifying') }}</h1>
    </template>
    <template v-else-if="state === 'success'">
      <CircleCheck :size="32" class="text-success" aria-hidden="true" />
      <h1 class="type-h2">{{ $t('account.verified') }}</h1>
      <UiButton :to="`/${cc}/account`">{{ $t('account.signIn') }}</UiButton>
    </template>
    <template v-else>
      <CircleAlert :size="32" class="text-danger" aria-hidden="true" />
      <h1 class="type-h2">{{ $t('account.verifyFailed') }}</h1>
      <p class="type-body text-ink-2">{{ $t('account.verifyFailedBody') }}</p>
      <UiButton :to="`/${cc}/account`" variant="secondary">{{ $t('account.signIn') }}</UiButton>
    </template>
  </div>
</template>
