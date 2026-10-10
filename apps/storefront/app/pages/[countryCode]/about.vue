<script setup lang="ts">
/** About: what ShaderPaper is (known), who is behind it (business input). */
const { t } = useI18n()
const cc = useCountryCode()
const { useCatalogCards } = useCatalog()
const { data: cards } = await useCatalogCards()
</script>

<template>
  <InfoPage :title="t('info.about.title')" :lede="t('info.about.lede')" current="about">
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.about.whatTitle') }}</h2>
      <p class="type-body text-ink-2">{{ $t('info.about.what1') }}</p>
      <p class="type-body text-ink-2">{{ $t('info.about.what2') }}</p>
      <p v-if="cards.length" class="type-body text-ink-2">
        {{ $t('info.about.catalogue', { n: cards.length, c: CATEGORIES.length }) }}
        <NuxtLink :to="`/${cc}/shop`" class="link">{{ $t('home.ctaShop') }}</NuxtLink>
      </p>
    </section>
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.about.whoTitle') }}</h2>
      <InfoTbw :what="$t('info.about.tbwWho')" />
    </section>
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.about.printTitle') }}</h2>
      <p class="type-body text-ink-2">{{ $t('info.about.print1') }}</p>
      <InfoTbw :what="$t('info.about.tbwPrint')" />
    </section>
  </InfoPage>
</template>
