import { describe, expect, it } from 'vitest'
import { findOption, findVariant, frameKeyOf, optionValues, variantParts } from '../variants'

const sizes = ['60 × 80 cm', '30 × 40 cm', '45 × 60 cm']
const frames = ['Oak', 'None', 'White', 'Black']
const product = {
  options: [
    { id: 'opt_size', title: 'Size', values: sizes.map((value) => ({ value })) },
    { id: 'opt_frame', title: 'Frame', values: frames.map((value) => ({ value })) },
  ],
  variants: sizes.flatMap((s) =>
    frames.map((f) => ({
      id: `var_${s}_${f}`,
      options: [
        { option_id: 'opt_size', value: s, option: { id: 'opt_size', title: 'Size' } },
        { option_id: 'opt_frame', value: f, option: { id: 'opt_frame', title: 'Frame' } },
      ],
    })),
  ),
}

describe('variants', () => {
  it('finds the options and orders their values', () => {
    expect(findOption(product, 'frame')?.id).toBe('opt_frame')
    expect(optionValues(product, 'size')).toEqual(['30 × 40 cm', '45 × 60 cm', '60 × 80 cm'])
    expect(optionValues(product, 'frame')).toEqual(['None', 'Black', 'White', 'Oak'])
  })

  it('finds the variant for a size and frame', () => {
    expect(findVariant(product, '45 × 60 cm', 'Oak')?.id).toBe('var_45 × 60 cm_Oak')
    expect(findVariant(product, '45 × 60 cm', 'Gold')).toBeNull()
  })

  it('reads frame keys and line parts', () => {
    expect(frameKeyOf('No frame')).toBe('none')
    expect(frameKeyOf('Natural oak')).toBe('oak')
    expect(variantParts(product.variants[9])).toEqual({ size: '45 × 60 cm', frame: 'None' })
    expect(variantParts({ id: 'v', title: '30 × 40 cm / Black' })).toEqual({ size: '30 × 40 cm', frame: 'Black' })
  })
})
