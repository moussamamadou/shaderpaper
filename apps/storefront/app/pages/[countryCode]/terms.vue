<script setup lang="ts">
/** Terms of sale: legal input; nothing is written in its place. */
const { t } = useI18n()
</script>

<template>
  <InfoPage :title="t('info.terms.title')" :lede="t('info.terms.lede')" current="terms">
    <InfoTbw :what="$t('info.terms.tbw')" />
  </InfoPage>
</template>
