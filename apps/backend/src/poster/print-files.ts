import { findPosterSize, type PosterSize } from "./catalog"

/**
 * Print files for custom map posters. A poster line item carries the customer's
 * design in `metadata.poster` (written by the storefront); once the order is
 * placed, the print renderer (apps/print-renderer) turns it into an image at the
 * size's print resolution, stored with the File Module, and the line item gets
 * `metadata.poster.print_file` (or `print_error`).
 *
 * A set prints one file per poster: L'Ensemble (`design.kind: "ensemble"`) the
 * sky's poster (« moment ») and the map's (« lieu »), Le Trio (`"trio"`) the
 * photo's (« nous ») between them, recorded under `metadata.poster.print_files`.
 */

/** A poster of a set: the sky's (« le moment »), the photo's (« nous ») or the map's (« le lieu »). */
export type PosterPart = "moment" | "nous" | "lieu"

/** The posters a design prints, left to right; a single poster has no part. */
export function posterParts(design: Record<string, unknown>): PosterPart[] {
  if (design.kind === "trio") return ["moment", "nous", "lieu"]
  return design.kind === "ensemble" ? ["moment", "lieu"] : []
}

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
  /** A set's files, one per poster. */
  print_files?: Partial<Record<PosterPart, PosterPrintFile>>
  print_error?: { message: string; at: string; part?: PosterPart }
}

/** A poster line item to render. */
export type PosterPrintItem = {
  item_id: string
  design: Record<string, unknown>
  size: PosterSize
  /** The poster of a set to render. */
  part?: PosterPart
}

export type PosterPrintFailure = { item_id: string; message: string; part?: PosterPart }

export type PosterPrintJob = {
  order_id: string
  display_id: number
  items: PosterPrintItem[]
  /** Poster lines that can't be rendered (e.g. unknown size). */
  skipped: PosterPrintFailure[]
}

type OrderItem = {
  id: string
  metadata?: Record<string, unknown> | null
  variant?: { metadata?: Record<string, unknown> | null } | null
} | null

type Order = { id: string; display_id?: number | string | null; items?: OrderItem[] | null }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const posterMetadata = (metadata: unknown): PosterLineMetadata | null => {
  const poster = isObject(metadata) ? metadata.poster : null
  return isObject(poster) && isObject(poster.design) ? (poster as PosterLineMetadata) : null
}

/**
 * The order's poster lines still needing a print file (all of them with `force`),
 * one item per poster of a set. The printed size is the purchased variant's; the
 * design's own size id is only a fallback for a variant deleted since.
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
    const parts = posterParts(poster.design)
    const todo = parts.length
      ? parts.filter((part) => force || !poster.print_files?.[part])
      : force || !poster.print_file ? [undefined] : []
    if (!todo.length) continue

    const product = isObject(poster.design.product) ? poster.design.product : {}
    const sizeId = item.variant?.metadata?.poster_size ?? product.sizeId
    const size = findPosterSize(sizeId)
    if (!size) {
      job.skipped.push({ item_id: item.id, message: `Unknown poster size "${String(sizeId)}"` })
      continue
    }
    for (const part of todo) {
      job.items.push({
        item_id: item.id,
        design: { ...poster.design, product: { ...product, sizeId: size.id } },
        size,
        ...(part ? { part } : {}),
      })
    }
  }
  return job
}

/** Print file size in px, in the design's orientation. */
export function printPixels(item: PosterPrintItem): { width: number; height: number } {
  const [short, long] = item.size.printPx
  const product = isObject(item.design.product) ? item.design.product : {}
  return product.orientation === "landscape"
    ? { width: long, height: short }
    : { width: short, height: long }
}

export type PrintOutcome = ({ print_file: PosterPrintFile } | { error: string; at: string }) & {
  part?: PosterPart
}

/**
 * Line item metadata with the render outcomes of its posters recorded (the design
 * and thumbnail are kept): each file as the line's `print_file`, or under its part
 * in `print_files`; a failure as `print_error`, which a render without one clears.
 */
export function withPrintOutcome(
  metadata: Record<string, unknown> | null | undefined,
  outcomes: PrintOutcome[]
): Record<string, unknown> {
  const { print_error: _error, ...poster } = posterMetadata(metadata) ?? {}
  let next: PosterLineMetadata = poster
  for (const outcome of outcomes) {
    const { part } = outcome
    if ("print_file" in outcome) {
      next = part
        ? { ...next, print_files: { ...next.print_files, [part]: outcome.print_file } }
        : { ...next, print_file: outcome.print_file }
    } else {
      next = { ...next, print_error: { message: outcome.error, at: outcome.at, ...(part ? { part } : {}) } }
    }
  }
  return { ...(metadata ?? {}), poster: next }
}

/** Files replaced by a new render (a forced re-render), to delete once it is recorded. */
export function supersededPrintFiles(
  items: { id: string; metadata?: Record<string, unknown> | null }[],
  rendered: { item_id: string; print_file: PosterPrintFile; part?: PosterPart }[]
): string[] {
  return rendered.flatMap(({ item_id, print_file, part }) => {
    const item = items.find((i) => i.id === item_id)
    const poster = posterMetadata(item?.metadata)
    const previous = (part ? poster?.print_files?.[part] : poster?.print_file)?.file_id
    return previous && previous !== print_file.file_id ? [previous] : []
  })
}
