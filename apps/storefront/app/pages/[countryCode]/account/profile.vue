<script setup lang="ts">
/**
 * Profile: name and phone (POST /api/customer). The email is the sign-in
 * and is shown, not edited here.
 */
const { customer, updateCustomer } = useCustomer()
const { t } = useI18n()
useSeoMeta({ title: () => t('account.profile') })

const form = reactive({ first_name: customer.value?.first_name ?? '', last_name: customer.value?.last_name ?? '', phone: customer.value?.phone ?? '' })
const errors = ref<Record<string, string | null>>({})
const saving = ref(false)
const result = ref<{ ok: boolean; message: string } | null>(null)
const save = async () => {
  errors.value = {
    first_name: form.first_name.trim() ? null : t('validation.first_name'),
    last_name: form.last_name.trim() ? null : t('validation.last_name'),
  }
  if (Object.values(errors.value).some(Boolean)) return
  saving.value = true
  result.value = null
  try {
    await updateCustomer({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim() || undefined })
    result.value = { ok: true, message: t('account.profileSaved') }
  } catch (err) {
    result.value = { ok: false, message: errorText(err) }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="customer" class="flex max-w-[560px] flex-col gap-6">
    <h1 class="type-h1">{{ $t('account.profile') }}</h1>
    <form class="flex flex-col gap-4" novalidate data-testid="profile-form" @submit.prevent="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiTextField v-model="form.first_name" :label="$t('address.firstName')" name="first_name" required autocomplete="given-name" :error="errors.first_name" />
        <UiTextField v-model="form.last_name" :label="$t('address.lastName')" name="last_name" required autocomplete="family-name" :error="errors.last_name" />
      </div>
      <UiTextField :model-value="customer.email" :label="$t('address.email')" name="email" type="email" disabled :hint="$t('account.emailFixed')" />
      <UiTextField v-model="form.phone" :label="$t('address.phone')" name="phone" type="tel" optional-label autocomplete="tel" />
      <UiBanner v-if="result" :tone="result.ok ? 'success' : 'danger'" :title="result.ok ? result.message : $t('account.profileFailed')" live>
        <template v-if="!result.ok">{{ result.message }}</template>
      </UiBanner>
      <UiButton type="submit" :loading="saving" class="self-start">{{ $t('account.saveProfile') }}</UiButton>
    </form>
  </div>
</template>
