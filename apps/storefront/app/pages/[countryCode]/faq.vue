<script setup lang="ts">
/**
 * FAQ: answers that are facts of the product as built (the customiser, the
 * sizes and frames on sale); questions whose answer is a business decision
 * get a "to be written" block instead of an answer.
 */
const { t } = useI18n()
const known = ['shader', 'customise', 'variation', 'preview', 'sizes', 'account'] as const
const open = ['delivery', 'returns', 'paper', 'payment'] as const
const items = computed(() => [...known, ...open].map((k) => ({ value: k, title: t(`info.faq.q.${k}`) })))
</script>

<template>
  <InfoPage :title="t('info.faq.title')" :lede="t('info.faq.lede')" current="faq">
    <UiAccordion :items="items" heading-level="h2">
      <template v-for="k in known" :key="k" #[k]>
        <p>{{ $t(`info.faq.a.${k}`) }}</p>
      </template>
      <template v-for="k in open" :key="k" #[k]>
        <InfoTbw :what="$t(`info.faq.tbw.${k}`)" compact />
      </template>
    </UiAccordion>
  </InfoPage>
</template>
