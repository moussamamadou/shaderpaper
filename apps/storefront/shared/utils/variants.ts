/**
 * Size × Frame on a poster product: which option is which, their values in
 * display order, and the variant for a pair. Option titles are matched loosely
 * ("Size", "Format"; "Frame", "Framing") so a renamed option still works.
 */
export interface VariantLike {
  id: string
  title?: string | null
  sku?: string | null
  options?: { option_id?: string | null; value?: string | null; option?: { id?: string; title?: string | null } | null }[] | null
  calculated_price?: { calculated_amount?: number | null; original_amount?: number | null; currency_code?: string | null } | null
}

export interface OptionLike {
  id: string
  title?: string | null
  values?: { id?: string; value?: string | null }[] | null
}

export interface ProductLike {
  options?: OptionLike[] | null
  variants?: VariantLike[] | null
}

export type FrameKey = 'none' | 'black' | 'white' | 'oak'

export function frameKeyOf(value: string | null | undefined): FrameKey {
  const v = (value ?? '').toLowerCase()
  if (v.includes('black')) return 'black'
  if (v.includes('white')) return 'white'
  if (v.includes('oak') || v.includes('wood') || v.includes('natural')) return 'oak'
  return 'none'
}

export function findOption(product: ProductLike, kind: 'size' | 'frame'): OptionLike | null {
  const opts = product.options ?? []
  const match = (o: OptionLike, words: string[]) => words.some((w) => (o.title ?? '').toLowerCase().includes(w))
  const byTitle = opts.find((o) => match(o, kind === 'size' ? ['size', 'format', 'dimension'] : ['frame']))
  if (byTitle) return byTitle
  // Untitled fallback: first option is the size, second the frame.
  return opts[kind === 'size' ? 0 : 1] ?? null
}

/** "30 × 40 cm" → [30, 40]; anything without two numbers sorts last. */
function sizeKey(value: string): number {
  const nums = value.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.'))) ?? []
  return nums.length >= 2 ? nums[0]! * nums[1]! : nums[0] ?? Number.POSITIVE_INFINITY
}

const FRAME_ORDER: FrameKey[] = ['none', 'black', 'white', 'oak']

export function optionValues(product: ProductLike, kind: 'size' | 'frame'): string[] {
  const opt = findOption(product, kind)
  if (!opt) return []
  const fromOption = (opt.values ?? []).map((v) => v.value).filter((v): v is string => !!v)
  const fromVariants = (product.variants ?? [])
    .map((v) => variantValue(v, opt))
    .filter((v): v is string => !!v)
  const values = [...new Set([...fromOption, ...fromVariants])]
  return kind === 'size'
    ? values.sort((a, b) => sizeKey(a) - sizeKey(b))
    : values.sort((a, b) => FRAME_ORDER.indexOf(frameKeyOf(a)) - FRAME_ORDER.indexOf(frameKeyOf(b)))
}

export function variantValue(variant: VariantLike, option: OptionLike): string | null {
  const o = variant.options?.find((x) => x.option_id === option.id || x.option?.id === option.id)
  return o?.value ?? null
}

export function findVariant(product: ProductLike, size: string | null, frame: string | null): VariantLike | null {
  const so = findOption(product, 'size')
  const fo = findOption(product, 'frame')
  return (
    (product.variants ?? []).find(
      (v) => (!so || variantValue(v, so) === size) && (!fo || variantValue(v, fo) === frame),
    ) ?? null
  )
}

/** Size, then frame, of a variant (for cart lines: "45 × 60 cm · Oak frame"). */
export function variantParts(variant: VariantLike | null | undefined): { size: string | null; frame: string | null } {
  if (!variant) return { size: null, frame: null }
  const opts = variant.options ?? []
  const size = opts.find((o) => /size|format/i.test(o.option?.title ?? ''))?.value ?? null
  const frame = opts.find((o) => /frame/i.test(o.option?.title ?? ''))?.value ?? null
  if (size || frame) return { size, frame }
  // No option titles on the line's variant: fall back to its title ("45 × 60 cm / Oak").
  const [a, b] = (variant.title ?? '').split(/\s*[/·|]\s*/)
  return { size: a || null, frame: b || null }
}
