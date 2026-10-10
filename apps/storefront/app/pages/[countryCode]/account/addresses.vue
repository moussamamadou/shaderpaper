<script setup lang="ts">
import type { HttpTypes } from '@medusajs/types'
import { MapPin, Plus } from 'lucide-vue-next'
import type { AddressErrors, AddressForm } from '~/utils/address-form'

/**
 * The address book: saved addresses as cards (edit, delete) and "Add an
 * address", both in a dialog with the same fields as checkout. Countries are
 * the region's (where the store ships).
 */
const { customer, addAddress, updateAddress, deleteAddress, retrieveCustomer } = useCustomer()
const { cart } = useCart()
const { t } = useI18n()
const cc = useCountryCode()
useSeoMeta({ title: () => t('account.addresses') })

const { getRegion } = useRegions()
const { data: region } = await useAsyncData(() => `region-${cc.value}`, () => getRegion(cc.value).catch(() => null))
const countries = computed(() =>
  ((region.value ?? cart.value?.region)?.countries ?? [])
    .map((c) => ({ value: c.iso_2 ?? '', label: c.display_name ?? c.name ?? (c.iso_2 ?? '').toUpperCase() }))
    .filter((c) => c.value)
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const dialogOpen = ref(false)
const editing = ref<HttpTypes.StoreCustomerAddress | null>(null)
const form = reactive<AddressForm>(addressForm())
const errors = ref<AddressErrors>({})
const saving = ref(false)
const formError = ref<string | null>(null)
const status = ref('')
const fields = ref<{ focus: (k: keyof AddressForm) => void } | null>(null)

const openNew = () => {
  editing.value = null
  Object.assign(form, addressForm({ country_code: countries.value.some((c) => c.value === cc.value) ? cc.value : '' }))
  errors.value = {}
  formError.value = null
  dialogOpen.value = true
}
const openEdit = (a: HttpTypes.StoreCustomerAddress) => {
  editing.value = a
  Object.assign(form, addressForm(a))
  errors.value = {}
  formError.value = null
  dialogOpen.value = true
}
const save = async () => {
  errors.value = validateAddress(form, t, { countries: countries.value.map((c) => c.value) })
  const first = ADDRESS_FIELD_ORDER.find((k) => errors.value[k])
  if (first) {
    if (first !== 'email') fields.value?.focus(first)
    return
  }
  saving.value = true
  formError.value = null
  try {
    const body = { ...cleanAddress(form) }
    const res = editing.value ? await updateAddress(editing.value.id, body) : await addAddress(body)
    if (!res.success) {
      formError.value = res.error ?? t('account.addressFailed')
      return
    }
    await retrieveCustomer()
    status.value = editing.value ? t('account.addressUpdated') : t('account.addressAdded')
    dialogOpen.value = false
  } catch (err) {
    formError.value = errorText(err)
  } finally {
    saving.value = false
  }
}
const removing = ref<string | null>(null)
const remove = async (a: HttpTypes.StoreCustomerAddress) => {
  removing.value = a.id
  try {
    await deleteAddress(a.id)
    await retrieveCustomer()
    status.value = t('account.addressRemoved')
  } catch (err) {
    status.value = errorText(err)
  } finally {
    removing.value = null
  }
}
</script>

<template>
  <div v-if="customer" class="flex flex-col gap-6">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h1 class="type-h1">{{ $t('account.addresses') }}</h1>
      <UiButton variant="secondary" data-testid="add-address" @click="openNew"><Plus :size="16" aria-hidden="true" />{{ $t('account.addAddress') }}</UiButton>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ status }}</p>
    <ul v-if="customer.addresses?.length" class="grid gap-4 md:grid-cols-2" data-testid="address-list">
      <li v-for="a in customer.addresses" :key="a.id" class="flex flex-col gap-4 rounded-xs border border-line bg-surface p-5">
        <p class="type-body-s text-ink-2">
          <span class="font-medium text-ink">{{ a.first_name }} {{ a.last_name }}</span><br />
          <template v-if="a.company">{{ a.company }}<br /></template>
          {{ a.address_1 }}<br />{{ a.postal_code }} {{ a.city }}<br />{{ countries.find((c) => c.value === a.country_code)?.label ?? (a.country_code ?? '').toUpperCase() }}
        </p>
        <div class="mt-auto flex gap-2">
          <UiButton variant="secondary" size="sm" :aria-label="$t('account.editAddressFor', { name: a.address_1 })" @click="openEdit(a)">{{ $t('checkout.edit') }}</UiButton>
          <UiButton variant="ghost" size="sm" :loading="removing === a.id" :aria-label="$t('account.removeAddressFor', { name: a.address_1 })" @click="remove(a)">{{ $t('cart.remove') }}</UiButton>
        </div>
      </li>
    </ul>
    <UiEmptyState v-else :title="$t('account.noAddressesTitle')" :body="$t('account.noAddressesBody')" compact>
      <template #icon><MapPin :size="26" aria-hidden="true" /></template>
    </UiEmptyState>

    <UiDialog v-model:open="dialogOpen" :title="editing ? $t('account.editAddress') : $t('account.addAddress')" size="lg">
      <form id="address-dialog-form" class="flex flex-col gap-4 p-5 md:p-6" novalidate @submit.prevent="save">
        <CheckoutAddressFields ref="fields" :form="form" :errors="errors" :countries="countries" section="account" name="address" />
        <UiBanner v-if="formError" tone="danger" :title="$t('account.addressFailed')" live>{{ formError }}</UiBanner>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UiButton variant="ghost" @click="dialogOpen = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" form="address-dialog-form" :loading="saving">{{ $t('account.saveAddress') }}</UiButton>
        </div>
      </template>
    </UiDialog>
  </div>
</template>
