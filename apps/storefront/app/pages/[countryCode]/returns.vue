<script setup lang="ts">
/** Returns: the policy is business and legal input; nothing is written in its place. */
const { t } = useI18n()
</script>

<template>
  <InfoPage :title="t('info.returns.title')" :lede="t('info.returns.lede')" current="returns">
    <InfoTbw :what="$t('info.returns.tbw')" />
    <InfoTbw :what="$t('info.returns.tbwDamaged')" />
  </InfoPage>
</template>
