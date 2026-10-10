<script setup lang="ts">
/**
 * Privacy: the policy itself is legal input. What the site technically
 * stores today is a fact of the code (server/utils/cookies.ts), listed as
 * such and not as a policy.
 */
const { t } = useI18n()
const cookies = ['_medusa_jwt', '_medusa_cart_id', '_medusa_cache_id', '_medusa_locale', '_medusa_pending_customer'] as const
</script>

<template>
  <InfoPage :title="t('info.privacy.title')" :lede="t('info.privacy.lede')" current="privacy">
    <InfoTbw :what="$t('info.privacy.tbw')" />
    <section class="flex flex-col gap-3">
      <h2 class="type-h3">{{ $t('info.privacy.cookiesTitle') }}</h2>
      <p class="type-body text-ink-2">{{ $t('info.privacy.cookiesIntro') }}</p>
      <dl class="flex flex-col divide-y divide-line border-y border-line">
        <div v-for="c in cookies" :key="c" class="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
          <dt class="font-mono type-body-s text-ink">{{ c }}</dt>
          <dd class="type-body-s text-ink-2">{{ $t(`info.privacy.cookie.${c}`) }}</dd>
        </div>
      </dl>
      <p class="type-body-s text-ink-3">{{ $t('info.privacy.cookiesNote') }}</p>
    </section>
  </InfoPage>
</template>
