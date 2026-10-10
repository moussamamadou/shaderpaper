import { describe, expect, it } from 'vitest'
import { defaultDesign } from '#shared/utils/design'
import { designSummary } from '../design-summary'

const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : k)

describe('designSummary', () => {
  it('says what the variation decides when nothing else is set', () => {
    expect(designSummary(defaultDesign('glass', { seed: 12 }), null, t)).toEqual([
      'customiser.variationN{"n":12}',
      'customiser.shapeFromVariation',
      'customiser.paletteFromVariation',
      'customiser.strengthLabel: customiser.strength.b',
    ])
  })

  it('lists the knobs and palette the buyer set', () => {
    const d = { ...defaultDesign('glass'), knobs: [0.5, null, null, 0.25], palette: 1, strength: 'v' as const }
    const [, knobs, palette, strength] = designSummary(d, null, t)
    expect(knobs).toBe('customiser.knobN{"n":1}: 50 · customiser.knobN{"n":4}: 25')
    expect(palette).toBe('customiser.paletteN{"n":2}')
    expect(strength).toBe('customiser.strengthLabel: customiser.strength.v')
  })
})
