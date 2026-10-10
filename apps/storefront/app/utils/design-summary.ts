import type { ShaderDesign } from '#shared/utils/design'
import { knobDisplay, normalizeKnobDefs } from '#shared/utils/knobs'

type T = (key: string, params?: Record<string, unknown>) => string

/**
 * The buyer's choices in words, for cart and order lines:
 * ["Variation 3", "Pattern: Rings · Lens: 60", "Palette 2", "Vivid"].
 * Knobs left to the variation are not listed; when none is set the line says so.
 */
export function designSummary(design: ShaderDesign, knobsMeta: unknown, t: T): string[] {
  const defs = normalizeKnobDefs(knobsMeta)
  const set = design.knobs
    .map((v, i) => {
      const def = defs[i]
      const shown = def ? knobDisplay(def, v) : v == null ? null : String(Math.round(v * 100))
      return shown == null ? null : `${def?.name ?? t('customiser.knobN', { n: i + 1 })}: ${shown}`
    })
    .filter((s): s is string => !!s)
  return [
    t('customiser.variationN', { n: design.seed }),
    set.length ? set.join(' · ') : t('customiser.shapeFromVariation'),
    design.palette == null ? t('customiser.paletteFromVariation') : t('customiser.paletteN', { n: design.palette + 1 }),
    t(`customiser.strength.${design.strength}`),
  ]
}
