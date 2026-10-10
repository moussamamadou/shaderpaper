<script setup lang="ts">
/**
 * Shipping: the countries come from the backend's region (a configuration
 * fact); costs are whatever checkout calculates; carrier, lead time and
 * delivery promise are business input.
 */
const { t } = useI18n()
const cc = useCountryCode()
const { getRegion } = useRegions()
const { data: region } = await useAsyncData(() => `region-${cc.value}`, () => getRegion(cc.value).catch(() => null))
const countries = computed(() => (region.value?.countries ?? []).map((c) => c.display_name ?? c.name ?? c.iso_2).filter(Boolean).sort())
</script>

<template>
  <InfoPage :title="t('info.shipping.title')" :lede="t('info.shipping.lede')" current="shipping">
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.shipping.whereTitle') }}</h2>
      <p v-if="countries.length" class="type-body text-ink-2">{{ $t('info.shipping.where', { list: countries.join(', ') }) }}</p>
      <p class="type-body-s text-ink-3">{{ $t('info.shipping.whereNote') }}</p>
    </section>
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.shipping.costTitle') }}</h2>
      <p class="type-body text-ink-2">{{ $t('info.shipping.cost') }}</p>
    </section>
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.shipping.timeTitle') }}</h2>
      <InfoTbw :what="$t('info.shipping.tbwTime')" />
    </section>
  </InfoPage>
</template>
