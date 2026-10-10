import { findPosterSize, findShaderPoster, frameFromSku, sizeFromSku, type PosterSize } from "./catalog"

/**
 * Print files for shader posters (ported from Méridien's map posters). A poster line item carries the
 * buyer's design in `metadata.poster` (written by the storefront):
 *
 *   { version: 1, design: { kind: "shader", id, seed, knobs: [k0..k3 | null], palette, strength },
 *     title, thumbnail? }
 *
 * Once the order is placed, the print renderer (apps/print-renderer) turns the design into an image at
 * the size's print resolution, stored as a private file with the File Module, and the line item gets
 * `metadata.poster.print_file` (or `print_error`). A shader poster is one sheet: no sets, no parts.
 */

/** `design.kind` of a shader poster; other kinds are not printed by this backend. */
export const SHADER_DESIGN_KIND = "shader"

export type PosterPrintFile = {
  /** File Module id; private file, get a download URL with `retrieveFile`. */
  file_id: string
  width: number
  height: number
  /** Poster size id (see catalog.ts). */
  size: string
  format: "png"
  rendered_at: string
}

export type PosterLineMetadata = {
  version?: number
  design?: Record<string, unknown>
  title?: string
  thumbnail?: string
  print_file?: PosterPrintFile
  print_error?: { message: string; at: string }
}

/** A poster line item to render. */
export type PosterPrintItem = {
  item_id: string
  design: Record<string, unknown>
  size: PosterSize
}

export type PosterPrintFailure = { item_id: string; message: string }

export type PosterPrintJob = {
  order_id: string
  display_id: number
  items: PosterPrintItem[]
  /** Poster lines that can't be rendered (e.g. unknown size or poster). */
  skipped: PosterPrintFailure[]
}

type OrderItem = {
  id: string
  metadata?: Record<string, unknown> | null
  variant_sku?: string | null
  variant?: { metadata?: Record<string, unknown> | null } | null
} | null

type Order = { id: string; display_id?: number | string | null; items?: OrderItem[] | null }

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** The line's poster metadata, when it has a design. */
export const posterMetadata = (metadata: unknown): PosterLineMetadata | null => {
  const poster = isObject(metadata) ? metadata.poster : null
  return isObject(poster) && isObject(poster.design) ? (poster as PosterLineMetadata) : null
}

/**
 * The printed size and frame of a line: the purchased variant's metadata, or the SKU's when the variant
 * was deleted since (the line keeps its `variant_sku`).
 */
export function lineSizeAndFrame(item: NonNullable<OrderItem>): { sizeId?: string; frameId?: string } {
  const meta = item.variant?.metadata
  const sizeId = typeof meta?.poster_size === "string" ? meta.poster_size : sizeFromSku(item.variant_sku)
  const frameId = typeof meta?.poster_frame === "string" ? meta.poster_frame : frameFromSku(item.variant_sku)
  return { sizeId, frameId }
}

/**
 * The order's shader poster lines still needing a print file (all of them with `force`). Lines with
 * another design kind, an unknown poster or an unknown size are reported in `skipped`.
 */
export function posterPrintJob(order: Order, force = false): PosterPrintJob {
  const job: PosterPrintJob = {
    order_id: order.id,
    display_id: Number(order.display_id) || 0,
    items: [],
    skipped: [],
  }
  for (const item of order.items ?? []) {
    const poster = item && posterMetadata(item.metadata)
    if (!item || !poster?.design) continue
    if (!force && poster.print_file) continue

    const { design } = poster
    if (design.kind !== SHADER_DESIGN_KIND) {
      job.skipped.push({ item_id: item.id, message: `Unknown design kind "${String(design.kind)}"` })
      continue
    }
    if (!findShaderPoster(design.id)) {
      job.skipped.push({ item_id: item.id, message: `Unknown poster "${String(design.id)}"` })
      continue
    }
    const { sizeId } = lineSizeAndFrame(item)
    const size = findPosterSize(sizeId)
    if (!size) {
      job.skipped.push({ item_id: item.id, message: `Unknown poster size "${String(sizeId)}"` })
      continue
    }
    job.items.push({ item_id: item.id, design, size })
  }
  return job
}

/** Print file size in px (shader posters are portrait). */
export function printPixels(item: PosterPrintItem): { width: number; height: number } {
  const [short, long] = item.size.printPx
  return { width: short, height: long }
}

export type PrintOutcome = { print_file: PosterPrintFile } | { error: string; at: string }

/**
 * Line item metadata with a render outcome recorded (the design and thumbnail are kept): the file as
 * `print_file`, or a failure as `print_error`, which a successful render clears.
 */
export function withPrintOutcome(
  metadata: Record<string, unknown> | null | undefined,
  outcome: PrintOutcome
): Record<string, unknown> {
  const { print_error: _error, ...poster } = posterMetadata(metadata) ?? {}
  const next: PosterLineMetadata =
    "print_file" in outcome
      ? { ...poster, print_file: outcome.print_file }
      : { ...poster, print_error: { message: outcome.error, at: outcome.at } }
  return { ...(metadata ?? {}), poster: next }
}

/** Files replaced by a new render (a forced re-render), to delete once it is recorded. */
export function supersededPrintFiles(
  items: { id: string; metadata?: Record<string, unknown> | null }[],
  rendered: { item_id: string; print_file: PosterPrintFile }[]
): string[] {
  return rendered.flatMap(({ item_id, print_file }) => {
    const item = items.find((i) => i.id === item_id)
    const previous = posterMetadata(item?.metadata)?.print_file?.file_id
    return previous && previous !== print_file.file_id ? [previous] : []
  })
}
