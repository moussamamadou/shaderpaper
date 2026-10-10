<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { NuxtLink } from '#components'
import type { CheckoutStep } from '~/utils/checkout'

/**
 * Checkout progress: Details, Delivery, Payment, Review. Done steps link back
 * (to edit them); the current one is aria-current="step"; later ones are text.
 */
const props = defineProps<{ current: CheckoutStep; done: Record<CheckoutStep, boolean> }>()
const route = useRoute()
const { t } = useI18n()
const steps = computed(() =>
  CHECKOUT_STEPS.map((s, i) => ({ value: s, n: i + 1, label: t(`checkout.steps.${s}`) })),
)
const index = computed(() => CHECKOUT_STEPS.indexOf(props.current))
</script>

<template>
  <nav :aria-label="$t('checkout.progress')">
    <ol class="flex items-center gap-2 md:gap-3" data-testid="checkout-stepper">
      <li v-for="(s, i) in steps" :key="s.value" class="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <component
          :is="i < index && done[s.value] ? NuxtLink : 'span'"
          :to="i < index && done[s.value] ? { path: route.path, query: { step: s.value } } : undefined"
          :aria-current="s.value === current ? 'step' : undefined"
          :class="[
            'flex min-h-11 min-w-0 items-center gap-2',
            i < index && done[s.value] ? 'group text-ink' : s.value === current ? 'text-ink' : 'text-ink-3',
          ]"
        >
          <span
            :class="[
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-pill type-caption',
              s.value === current ? 'bg-ink text-paper' : i < index && done[s.value] ? 'border border-ink' : 'border border-line-strong',
            ]"
            aria-hidden="true"
          >
            <Check v-if="i < index && done[s.value]" :size="14" />
            <template v-else>{{ s.n }}</template>
          </span>
          <span :class="['truncate type-body-s', s.value === current ? 'font-medium' : '', s.value !== current ? 'max-sm:sr-only' : '', i < index && done[s.value] ? 'group-hover:underline group-hover:underline-offset-4' : '']">
            {{ s.label }}<span v-if="i < index && done[s.value]" class="sr-only"> ({{ $t('checkout.stepDone') }})</span>
          </span>
        </component>
        <span v-if="i < steps.length - 1" class="h-px min-w-3 flex-1 bg-line" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>
