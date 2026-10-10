import { describe, expect, it } from 'vitest'
import { knobDisplay, knobInitialValue, knobStepIndex, knobValueForIndex, normalizeKnobDefs } from '../knobs'

// KNOBDEF entries as the engine writes them (explorations/index.html).
const glass = [
  { n: 'Pattern', opts: ['Stripes', 'Diagonal', 'Rings', 'Checks'], steps: 4, d: 0 },
  { n: 'Lens', lo: 'small', hi: 'large', d: 0.6 },
  { n: 'Scale', lo: 'bold', hi: 'fine', d: 0.35 },
  { n: 'Prism', lo: 'clear', hi: 'rainbow', d: 0.25 },
]

describe('knobs', () => {
  it('normalises the engine shape', () => {
    const defs = normalizeKnobDefs(glass)
    expect(defs).toHaveLength(4)
    expect(defs[0]).toEqual({ name: 'Pattern', lo: undefined, hi: undefined, default: 0, steps: 4, options: ['Stripes', 'Diagonal', 'Rings', 'Checks'] })
    expect(defs[1]).toEqual({ name: 'Lens', lo: 'small', hi: 'large', default: 0.6 })
  })

  it('accepts JSON strings and spelled-out keys, drops junk', () => {
    expect(normalizeKnobDefs(JSON.stringify(glass))).toHaveLength(4)
    expect(normalizeKnobDefs([{ name: 'Puff', low: 'flat', high: 'inflated', default: '0.75' }])).toEqual([
      { name: 'Puff', lo: 'flat', hi: 'inflated', default: 0.75 },
    ])
    expect(normalizeKnobDefs([null, { d: 1 }, 'x'])).toEqual([])
    expect(normalizeKnobDefs('{nope')).toEqual([])
  })

  it('maps choice knobs to the middle of their slot, as the engine does', () => {
    expect(knobValueForIndex(2, 4)).toBe(0.625)
    expect(knobStepIndex(0.625, 4)).toBe(2)
    expect(knobStepIndex(1, 4)).toBe(3)
    // puffy "Layout": opts Single/Six/Twelve, d 0.5 → Six (engine: round(d*(steps-1)))
    expect(knobInitialValue({ name: 'Layout', default: 0.5, steps: 3, options: ['Single', 'Six', 'Twelve'] })).toBe(0.5)
    expect(knobInitialValue({ name: 'Pieces', default: 0.67, steps: 4 })).toBe(0.625)
  })

  it('displays values', () => {
    const [pattern, lens] = normalizeKnobDefs(glass)
    expect(knobDisplay(pattern!, 0.625)).toBe('Rings')
    expect(knobDisplay(lens!, 0.6)).toBe('60')
    expect(knobDisplay(lens!, null)).toBeNull()
    expect(knobDisplay({ name: 'X', default: 0, steps: 3 }, 0.9)).toBe('3 / 3')
  })
})
