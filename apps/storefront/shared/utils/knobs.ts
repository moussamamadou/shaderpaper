/**
 * The four client knobs of a poster, as the engine defines them in
 * KNOBDEF[id] (explorations/index.html) and the backend copies them into
 * product.metadata.knobs: `{ n: name, lo, hi, d: default, steps?, opts? }`.
 * A knob value is a number in 0..1; a knob with `steps` picks one of that many
 * options and stores the middle of its slot, (index + 0.5) / steps, which is
 * what the engine's KV()/kv() expect.
 */
export interface KnobDef {
  name: string
  /** Label of the low end (continuous knobs). */
  lo?: string
  /** Label of the high end (continuous knobs). */
  hi?: string
  /** Default value, 0..1. */
  default: number
  /** Number of options for a choice knob. */
  steps?: number
  /** Option names for a choice knob (length = steps). */
  options?: string[]
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Accepts the engine's shape ({n, lo, hi, d, steps, opts}) and a spelled-out one ({name, low, high, default, options}). */
export function normalizeKnobDefs(raw: unknown): KnobDef[] {
  let list: unknown = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  const out: KnobDef[] = []
  for (const item of list.slice(0, 4)) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const name = str(r.n) ?? str(r.name) ?? str(r.label)
    if (!name) continue
    const optsRaw = Array.isArray(r.opts) ? r.opts : Array.isArray(r.options) ? r.options : undefined
    const options = optsRaw?.map((o) => String(o))
    let steps = num(r.steps)
    if (options?.length && !steps) steps = options.length
    steps = steps && steps >= 2 ? Math.round(steps) : undefined
    out.push({
      name,
      lo: str(r.lo) ?? str(r.low) ?? str(r.min_label),
      hi: str(r.hi) ?? str(r.high) ?? str(r.max_label),
      default: clamp01(num(r.d) ?? num(r.default) ?? 0.5),
      ...(steps ? { steps } : {}),
      ...(steps && options?.length ? { options: options.slice(0, steps) } : {}),
    })
  }
  return out
}

/** The option index a value falls in, for a choice knob. */
export function knobStepIndex(value: number, steps: number): number {
  return Math.max(0, Math.min(steps - 1, Math.floor(clamp01(value) * steps)))
}

/** The stored value for option `index` of a choice knob: the middle of its slot. */
export function knobValueForIndex(index: number, steps: number): number {
  const i = Math.max(0, Math.min(steps - 1, Math.round(index)))
  return Math.round(((i + 0.5) / steps) * 1000) / 1000
}

/** The value a knob starts from in the panel (the engine's czState: a choice default rounds to the nearest option). */
export function knobInitialValue(def: KnobDef): number {
  return def.steps ? knobValueForIndex(Math.round(def.default * (def.steps - 1)), def.steps) : def.default
}

/** What a knob shows: its option name, "n / steps", 0–100, or null while the seed decides. */
export function knobDisplay(def: KnobDef, value: number | null): string | null {
  if (value == null) return null
  if (def.steps) {
    const i = knobStepIndex(value, def.steps)
    return def.options?.[i] ?? `${i + 1} / ${def.steps}`
  }
  return String(Math.round(clamp01(value) * 100))
}
