<script setup lang="ts">
import type { CustomerAuthState } from '~/composables/use-customer'

/**
 * Sign in / create account (Medusa customer auth, MapAndSky's Login and
 * Register). Fields are checked before sending; a server error or an
 * "check your inbox" (email verification) answer shows above the button.
 * On success the customer and the cart (moved onto the account) are
 * refetched, and the account page swaps to the dashboard.
 */
const { t } = useI18n()
const { login, signup } = useCustomer()
const tab = ref<'sign-in' | 'register'>('sign-in')
const tabs = computed(() => [
  { value: 'sign-in', label: t('account.signIn') },
  { value: 'register', label: t('account.register') },
])

const si = reactive({ email: '', password: '' })
const siErrors = ref<Record<string, string | null>>({})
const siResult = ref<CustomerAuthState | null>(null)
const siPending = ref(false)
const signIn = async () => {
  siErrors.value = {
    email: !si.email.trim() ? t('validation.emailRequired') : !isEmail(si.email) ? t('validation.emailInvalid') : null,
    password: !si.password ? t('validation.passwordRequired') : null,
  }
  if (Object.values(siErrors.value).some(Boolean)) return
  siPending.value = true
  try {
    siResult.value = await login({ email: si.email.trim(), password: si.password })
  } catch (err) {
    siResult.value = { state: 'error', error: errorText(err) }
  } finally {
    siPending.value = false
  }
  if (siResult.value?.state === 'success') await refreshNuxtData(['customer-data', 'cart-data'])
}

const rg = reactive({ first_name: '', last_name: '', email: '', phone: '', password: '' })
const rgErrors = ref<Record<string, string | null>>({})
const rgResult = ref<CustomerAuthState | null>(null)
const rgPending = ref(false)
const register = async () => {
  rgErrors.value = {
    first_name: !rg.first_name.trim() ? t('validation.first_name') : null,
    last_name: !rg.last_name.trim() ? t('validation.last_name') : null,
    email: !rg.email.trim() ? t('validation.emailRequired') : !isEmail(rg.email) ? t('validation.emailInvalid') : null,
    password: rg.password.length < 8 ? t('validation.passwordLength') : null,
  }
  if (Object.values(rgErrors.value).some(Boolean)) return
  rgPending.value = true
  try {
    rgResult.value = await signup({ ...rg, email: rg.email.trim(), phone: rg.phone.trim() || undefined })
  } catch (err) {
    rgResult.value = { state: 'error', error: errorText(err) }
  } finally {
    rgPending.value = false
  }
  if (rgResult.value?.state === 'success') await refreshNuxtData(['customer-data', 'cart-data'])
}
</script>

<template>
  <div class="mx-auto w-full max-w-[440px]" data-testid="account-auth">
    <h1 class="type-h1">{{ $t('account.welcome') }}</h1>
    <p class="mt-2 type-body text-ink-2">{{ $t('account.welcomeBody') }}</p>
    <UiTabs v-model="tab" :tabs="tabs" :label="$t('account.authTabs')" stretch class="mt-8">
      <template #sign-in>
        <form class="flex flex-col gap-4" novalidate data-testid="login-form" @submit.prevent="signIn">
          <UiTextField v-model="si.email" :label="$t('address.email')" name="email" type="email" required autocomplete="email" :error="siErrors.email" />
          <UiTextField v-model="si.password" :label="$t('account.password')" name="password" type="password" required autocomplete="current-password" :error="siErrors.password" />
          <UiBanner v-if="siResult?.state === 'error'" tone="danger" :title="$t('account.signInFailed')" live data-testid="login-error">{{ siResult.error }}</UiBanner>
          <UiBanner v-if="siResult?.state === 'verification_required'" tone="info" :title="$t('account.checkInbox')" live>
            {{ $t('account.verificationSent', { email: siResult.email }) }}
          </UiBanner>
          <UiButton type="submit" size="lg" block :loading="siPending" data-testid="sign-in-button">{{ $t('account.signIn') }}</UiButton>
        </form>
      </template>
      <template #register>
        <form class="flex flex-col gap-4" novalidate data-testid="register-form" @submit.prevent="register">
          <div class="grid grid-cols-2 gap-3">
            <UiTextField v-model="rg.first_name" :label="$t('address.firstName')" name="first_name" required autocomplete="given-name" :error="rgErrors.first_name" />
            <UiTextField v-model="rg.last_name" :label="$t('address.lastName')" name="last_name" required autocomplete="family-name" :error="rgErrors.last_name" />
          </div>
          <UiTextField v-model="rg.email" :label="$t('address.email')" name="email" type="email" required autocomplete="email" :error="rgErrors.email" />
          <UiTextField v-model="rg.phone" :label="$t('address.phone')" name="phone" type="tel" optional-label autocomplete="tel" />
          <UiTextField v-model="rg.password" :label="$t('account.password')" name="password" type="password" required autocomplete="new-password" :hint="$t('account.passwordHint')" :error="rgErrors.password" />
          <UiBanner v-if="rgResult?.state === 'error'" tone="danger" :title="$t('account.registerFailed')" live>{{ rgResult.error }}</UiBanner>
          <UiBanner v-if="rgResult?.state === 'verification_required'" tone="info" :title="$t('account.checkInbox')" live>
            {{ $t('account.verificationSent', { email: rgResult.email }) }}
          </UiBanner>
          <InfoTbw :what="$t('account.tbwPrivacy')" compact />
          <UiButton type="submit" size="lg" block :loading="rgPending" data-testid="register-button">{{ $t('account.createAccount') }}</UiButton>
        </form>
      </template>
    </UiTabs>
  </div>
</template>
