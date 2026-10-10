<script setup lang="ts">
import { RotateCcw, Shuffle } from 'lucide-vue-next'
import type { KnobDef } from '#shared/utils/knobs'
import type { ShaderDesign, Strength } from '#shared/utils/design'

/**
 * The customiser controls: the poster's four knobs (sliders; choice knobs as
 * segmented options), its palettes, colour strength, and the variation
 * (New variation / Reset).
 *
 * Below lg the product page shows one group at a time under tabs: `section`
 * names the visible one and the others are hidden with CSS (every control
 * stays in the page, so the design and focus survive a breakpoint change).
 * `panelId` prefixes the groups' ids (`<panelId>-shape`, `<panelId>-colour`)
 * for the tabs' aria-controls; `tabbed` gives them the tabpanel role.
 */
const props = withDefaults(
  defineProps<{
    knobs: KnobDef[]
    palettes: { n: string; c: string[] }[]
    /** The palette the engine painted with (the seed's choice when design.palette is null). */
    currentPalette: number | null
    section?: 'shape' | 'colour' | 'size' | null
    panelId?: string
    tabbed?: boolean
  }>(),
  { section: null, panelId: '', tabbed: false },
)
const design = defineModel<ShaderDesign>({ required: true })
const emit = defineEmits<{ reset: []; variation: [] }>()
const { t } = useI18n()

const setKnob = (i: number, v: number | null) => {
  const knobs = design.value.knobs.slice()
  knobs[i] = v == null ? null : Math.round(v * 1000) / 1000
  design.value = { ...design.value, knobs }
}
const choiceIndex = (i: number) => {
  const v = design.value.knobs[i]
  const def = props.knobs[i]
  return v == null || !def?.steps ? null : knobStepIndex(v, def.steps)
}
const setChoice = (i: number, idx: number | null) => {
  const def = props.knobs[i]
  if (idx == null || !def?.steps) return
  setKnob(i, knobValueForIndex(idx, def.steps))
}

const paletteModel = computed<number | null>({
  get: () => design.value.palette ?? props.currentPalette,
  set: (v) => {
    design.value = { ...design.value, palette: v }
  },
})
const strengthModel = computed<Strength | null>({
  get: () => design.value.strength,
  set: (v) => {
    if (v) design.value = { ...design.value, strength: v }
  },
})
const strengths = computed(() => (['n', 'b', 'v'] as const).map((v) => ({ value: v, label: t(`customiser.strength.${v}`) })))
const anyKnobSet = computed(() => design.value.knobs.some((k) => k != null))
const uid = useId()
const paletteName = `pal-${uid}`
const pid = computed(() => props.panelId || `cust-${uid}`)
/** A group is hidden below lg unless it is the active tab. */
const hidden = (s: 'shape' | 'colour') => (props.section && props.section !== s ? 'max-lg:hidden' : '')
const panel = (s: 'shape' | 'colour') =>
  props.tabbed ? { role: 'tabpanel', 'aria-labelledby': `${pid.value}-${s}-tab`, tabindex: -1 } : {}
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Shape: the four knobs -->
    <div :id="`${pid}-shape`" v-bind="panel('shape')" :class="['flex flex-col gap-8', hidden('shape')]">
    <section class="flex flex-col gap-5" :aria-labelledby="`${paletteName}-shape`">
      <div class="flex items-baseline justify-between gap-3">
        <h2 :id="`${paletteName}-shape`" class="type-label text-ink">{{ $t('customiser.shape') }}</h2>
        <button
          v-if="anyKnobSet"
          type="button"
          class="inline-flex min-h-11 items-center type-caption text-ink-3 underline-offset-4 hover:text-ink hover:underline md:min-h-0"
          @click="design = { ...design, knobs: [null, null, null, null] }"
        >
          {{ $t('customiser.shapeAuto') }}
        </button>
      </div>
      <p v-if="!knobs.length" class="type-body-s text-ink-3">{{ $t('customiser.noKnobs') }}</p>
      <template v-for="(def, i) in knobs" :key="def.name">
        <div v-if="def.steps" class="flex flex-col gap-1">
          <UiSegmentedControl
            :legend="def.name"
            :options="(def.options ?? Array.from({ length: def.steps }, (_, n) => String(n + 1))).map((label, n) => ({ value: n, label }))"
            :model-value="choiceIndex(i)"
            :wrap="(def.steps ?? 0) > 4"
            size="sm"
            @update:model-value="(v: number | null) => setChoice(i, v)"
          />
          <p v-if="design.knobs[i] == null" class="type-caption text-ink-3">{{ $t('customiser.fromVariation') }}</p>
        </div>
        <UiKnobSlider
          v-else
          :label="def.name"
          :lo="def.lo"
          :hi="def.hi"
          :rest-value="knobInitialValue(def)"
          :model-value="design.knobs[i] ?? null"
          @update:model-value="(v: number) => setKnob(i, v)"
        />
      </template>
    </section>

    <!-- Variation -->
    <section class="flex flex-col gap-3" :aria-labelledby="`${paletteName}-var`">
      <div class="flex items-baseline justify-between">
        <h2 :id="`${paletteName}-var`" class="type-label text-ink">{{ $t('customiser.variation') }}</h2>
        <span class="type-caption tabular-nums text-ink-3" aria-live="polite" data-testid="variation-number">{{ $t('customiser.variationN', { n: design.seed }) }}</span>
      </div>
      <p class="type-body-s text-ink-3">{{ $t('customiser.variationHelp') }}</p>
      <div class="flex flex-wrap gap-2">
        <UiButton variant="secondary" size="sm" data-testid="new-variation" @click="emit('variation')">
          <Shuffle :size="16" aria-hidden="true" /> {{ $t('customiser.newVariation') }}
        </UiButton>
        <UiButton variant="ghost" size="sm" data-testid="reset-design" @click="emit('reset')">
          <RotateCcw :size="16" aria-hidden="true" /> {{ $t('customiser.reset') }}
        </UiButton>
      </div>
    </section>
    </div>

    <!-- Colour: palette and strength -->
    <section :id="`${pid}-colour`" v-bind="panel('colour')" :class="['flex flex-col gap-5', hidden('colour')]">
      <h2 :id="`${paletteName}-colour`" class="type-label text-ink">{{ $t('customiser.colour') }}</h2>
      <fieldset v-if="palettes.length" class="min-w-0">
        <legend class="mb-2 type-body-s font-medium text-ink">
          {{ $t('customiser.palette') }}
          <span v-if="design.palette == null" class="ml-2 type-caption text-ink-3">{{ $t('customiser.fromVariation') }}</span>
        </legend>
        <div class="flex flex-wrap gap-1" data-testid="palette-swatches">
          <UiPaletteSwatch
            v-for="(p, i) in palettes"
            :key="p.n + i"
            v-model="paletteModel"
            :value="i"
            :name="paletteName"
            :colors="p.c"
            :label="$t('customiser.paletteNamed', { n: i + 1, name: p.n })"
          />
        </div>
      </fieldset>
      <p v-else class="type-body-s text-ink-3">{{ $t('customiser.fixedColours') }}</p>
      <UiSegmentedControl v-model="strengthModel" :legend="$t('customiser.strengthLabel')" :options="strengths" />
    </section>
  </div>
</template>
