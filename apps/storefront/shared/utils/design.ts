/**
 * A buyer's poster design and the ways it travels:
 *
 * - in the cart line: `metadata.poster = { version: 1, design, title, thumbnail? }`
 *   (the same key Méridien uses, so the print pipeline ports unchanged);
 * - in the product page URL, so a configuration is shareable (`?v=&k=&pal=&lvl=`);
 * - to the engine iframe as `#embed?id=&seed=&k=&pal=&lvl=`;
 * - to the print render page as `/render?d=<base64url JSON>`.
 *
 * `seed` is the variation number (1, 2, …): variation 1 with every knob and
 * the palette left to the seed (null) is plate 01 of the catalogue, the image
 * the product thumbnail is cut from.
 */
export type Strength = 'n' | 'b' | 'v'

export interface ShaderDesign {
  kind: 'shader'
  /**
   * Poster id in the engine's catalogue (product.metadata.shader.id), e.g. "glass".
   * Usually the product handle too, but not always: Medusa refuses "_" in
   * handles, so "k_cpack" is sold under the handle "k-cpack".
   */
  id: string
  /** Variation number, 1 … 9999. */
  seed: number
  /** Four knob values in 0..1; null hands that choice back to the seed. */
  knobs: (number | null)[]
  /** Palette index within the poster's palette family; null = the seed's choice. */
  palette: number | null
  /** Colour strength: natural, balanced, vivid. */
  strength: Strength
}

export interface PosterLineMetadata {
  version: 1
  design: ShaderDesign
  title: string
  /** Small preview of the customised poster (data URL), when the browser could make one. */
  thumbnail?: string
}

export const STRENGTHS: readonly Strength[] = ['n', 'b', 'v'] as const
export const MAX_SEED = 9999
const ID_RE = /^[a-z0-9_-]{1,40}$/

const round3 = (n: number) => Math.round(n * 1000) / 1000

export function isStrength(v: unknown): v is Strength {
  return v === 'n' || v === 'b' || v === 'v'
}

export function defaultDesign(id: string, opts: { seed?: number; strength?: Strength } = {}): ShaderDesign {
  return {
    kind: 'shader',
    id,
    seed: clampSeed(opts.seed ?? 1),
    knobs: [null, null, null, null],
    palette: null,
    strength: opts.strength ?? 'b',
  }
}

export function clampSeed(n: unknown): number {
  const v = Math.floor(Number(n))
  return Number.isFinite(v) && v >= 1 ? Math.min(MAX_SEED, v) : 1
}

function knobValue(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 'n' || v === 'null') return null
  const n = Number(v)
  return Number.isFinite(n) ? round3(Math.max(0, Math.min(1, n))) : null
}

function paletteValue(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === 'null') return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 && n < 100 ? n : null
}

/** Validates anything claiming to be a design; null when it is not one. */
export function normalizeDesign(input: unknown): ShaderDesign | null {
  if (!input || typeof input !== 'object') return null
  const r = input as Record<string, unknown>
  if (r.kind !== undefined && r.kind !== 'shader') return null
  const id = typeof r.id === 'string' ? r.id : ''
  if (!ID_RE.test(id)) return null
  const knobsIn = Array.isArray(r.knobs) ? r.knobs : []
  return {
    kind: 'shader',
    id,
    seed: clampSeed(r.seed),
    knobs: [0, 1, 2, 3].map((i) => knobValue(knobsIn[i])),
    palette: paletteValue(r.palette),
    strength: isStrength(r.strength) ? r.strength : 'b',
  }
}

/** The design as product-page query params (only what differs from the default). */
export function designToQuery(d: ShaderDesign): Record<string, string> {
  const q: Record<string, string> = {}
  if (d.seed !== 1) q.v = String(d.seed)
  if (d.knobs.some((k) => k != null)) q.k = d.knobs.map((k) => (k == null ? '' : String(k))).join(',')
  if (d.palette != null) q.pal = String(d.palette)
  q.lvl = d.strength
  return q
}

type QueryValue = string | null | undefined | (string | null)[]
const first = (v: QueryValue): string | undefined => (Array.isArray(v) ? (v[0] ?? undefined) : (v ?? undefined))

/** Reads a design back from product-page query params, starting from `base` for what is absent. */
export function designFromQuery(query: Record<string, QueryValue>, base: ShaderDesign): ShaderDesign {
  const v = first(query.v)
  const k = first(query.k)
  const pal = first(query.pal)
  const lvl = first(query.lvl)
  const knobs = k !== undefined ? k.split(',') : null
  return {
    ...base,
    seed: v !== undefined ? clampSeed(v) : base.seed,
    knobs: knobs ? [0, 1, 2, 3].map((i) => knobValue(knobs[i])) : base.knobs.slice(),
    palette: pal !== undefined ? paletteValue(pal) : base.palette,
    strength: isStrength(lvl) ? lvl : base.strength,
  }
}

/** The engine iframe's hash: `#embed?id=…&seed=…&k=…&pal=…&lvl=…` (+ `dpr` for print renders). */
export function engineHash(d: ShaderDesign, opts: { dpr?: number } = {}): string {
  const p = new URLSearchParams()
  p.set('id', d.id)
  p.set('seed', String(d.seed))
  p.set('k', d.knobs.map((k) => (k == null ? '' : String(k))).join(','))
  p.set('pal', d.palette == null ? '' : String(d.palette))
  p.set('lvl', d.strength)
  if (opts.dpr) p.set('dpr', String(opts.dpr))
  return `#embed?${p.toString()}`
}

/** The postMessage the engine re-renders on. */
export function engineMessage(d: ShaderDesign, seq?: number) {
  return { type: 'sp:set' as const, id: d.id, seed: d.seed, k: d.knobs.slice(), pal: d.palette, lvl: d.strength, seq }
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** `/render?d=` value: base64url of the design's JSON. */
export function encodeDesign(d: ShaderDesign): string {
  const { kind, id, seed, knobs, palette, strength } = d
  return toBase64Url(JSON.stringify({ kind, id, seed, knobs, palette, strength }))
}

export function decodeDesign(s: unknown): ShaderDesign | null {
  if (typeof s !== 'string' || !s || s.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(s)) return null
  try {
    const value: unknown = JSON.parse(fromBase64Url(s))
    // Accept the line's whole `metadata.poster` ({ version, design, title }) as well as the bare design.
    const inner = value && typeof value === 'object' && 'design' in value ? (value as { design: unknown }).design : value
    return normalizeDesign(inner)
  } catch {
    return null
  }
}

/** The design stored on a cart or order line, if the line carries one. */
export function lineDesign(metadata: unknown): PosterLineMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null
  const poster = (metadata as Record<string, unknown>).poster
  if (!poster || typeof poster !== 'object') return null
  const p = poster as Record<string, unknown>
  const design = normalizeDesign(p.design)
  if (!design) return null
  return {
    version: 1,
    design,
    title: typeof p.title === 'string' ? p.title : design.id,
    ...(typeof p.thumbnail === 'string' && p.thumbnail.startsWith('data:image/') ? { thumbnail: p.thumbnail } : {}),
  }
}

export function sameDesign(a: ShaderDesign, b: ShaderDesign): boolean {
  return (
    a.id === b.id &&
    a.seed === b.seed &&
    a.palette === b.palette &&
    a.strength === b.strength &&
    a.knobs.every((k, i) => k === b.knobs[i])
  )
}
