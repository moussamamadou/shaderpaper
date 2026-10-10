<script setup lang="ts">
/**
 * An address as form fields (checkout shipping and billing, account address
 * book). Labels are visible, required fields say so, optional ones are
 * marked, and each error is tied to its field. `section` scopes browser
 * autofill ("shipping", "billing").
 */
import type { AddressErrors, AddressForm } from '~/utils/address-form'

const props = withDefaults(
  defineProps<{
    form: AddressForm
    errors?: AddressErrors
    countries: { value: string; label: string }[]
    section?: string
    name?: string
  }>(),
  { errors: () => ({}), section: 'shipping', name: 'address' },
)
const refs: Partial<Record<keyof AddressForm, { focus: () => void } | null>> = {}
const setRef = (k: keyof AddressForm) => (el: unknown) => {
  refs[k] = el as { focus: () => void } | null
}
const ac = (token: string) => `section-${props.section} ${props.section === 'billing' ? 'billing' : 'shipping'} ${token}`
defineExpose({ focus: (k: keyof AddressForm) => refs[k]?.focus() })
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <UiTextField :ref="setRef('first_name')" v-model="form.first_name" :label="$t('address.firstName')" :name="`${name}.first_name`" required :error="errors.first_name" :autocomplete="ac('given-name')" />
    <UiTextField :ref="setRef('last_name')" v-model="form.last_name" :label="$t('address.lastName')" :name="`${name}.last_name`" required :error="errors.last_name" :autocomplete="ac('family-name')" />
    <div class="sm:col-span-2">
      <UiTextField :ref="setRef('address_1')" v-model="form.address_1" :label="$t('address.address1')" :name="`${name}.address_1`" required :error="errors.address_1" :autocomplete="ac('address-line1')" />
    </div>
    <div class="sm:col-span-2">
      <UiTextField v-model="form.company" :label="$t('address.company')" :name="`${name}.company`" optional-label :autocomplete="ac('organization')" />
    </div>
    <UiTextField :ref="setRef('postal_code')" v-model="form.postal_code" :label="$t('address.postalCode')" :name="`${name}.postal_code`" required :error="errors.postal_code" :autocomplete="ac('postal-code')" />
    <UiTextField :ref="setRef('city')" v-model="form.city" :label="$t('address.city')" :name="`${name}.city`" required :error="errors.city" :autocomplete="ac('address-level2')" />
    <UiSelect
      :ref="setRef('country_code')"
      v-model="form.country_code"
      :label="$t('address.country')"
      :name="`${name}.country_code`"
      :options="countries"
      :placeholder="$t('address.countryPlaceholder')"
      required
      :error="errors.country_code"
      :autocomplete="ac('country')"
    />
    <UiTextField v-model="form.province" :label="$t('address.province')" :name="`${name}.province`" optional-label :autocomplete="ac('address-level1')" />
    <div class="sm:col-span-2">
      <UiTextField v-model="form.phone" :label="$t('address.phone')" :name="`${name}.phone`" type="tel" optional-label :autocomplete="ac('tel')" />
    </div>
  </div>
</template>
