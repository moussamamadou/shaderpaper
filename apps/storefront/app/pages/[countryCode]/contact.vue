<script setup lang="ts">
/** Contact: no address, email or hours are known yet; nothing is invented. */
const { t } = useI18n()
const cc = useCountryCode()
</script>

<template>
  <InfoPage :title="t('info.contact.title')" :lede="t('info.contact.lede')" current="contact">
    <InfoTbw :what="$t('info.contact.tbw')" />
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.contact.ordersTitle') }}</h2>
      <p class="type-body text-ink-2">
        {{ $t('info.contact.orders') }}
        <NuxtLink :to="`/${cc}/account/orders`" class="link">{{ $t('account.orders') }}</NuxtLink>
      </p>
    </section>
  </InfoPage>
</template>
