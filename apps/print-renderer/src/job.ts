/**
 * A render request and its geometry. The render page lays the poster out at a
 * logical size (short side 1000 CSS px, see README.md, "Render page contract"); the
 * print file is that page captured at deviceScaleFactor = output px / logical px.
 */

export const LOGICAL_SHORT_SIDE = 1000
const MAX_DESIGN_BYTES = 32 * 1024

/**
 * The design as the render page's `d` parameter: its JSON, UTF-8, base64url
 * (RFC 4648 §5, no padding). The storefront decodes it the same way.
 */
export function encodeDesign(design: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(design), 'utf8').toString('base64url')
}

/** The inverse of encodeDesign; null when `encoded` isn't a base64url JSON object. */
export function decodeDesign(encoded: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null
  try {
    const value: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return isObject(value) ? value : null
  } catch {
    return null
  }
}

export type ImageFormat = 'png' | 'jpeg'

export interface RenderJob {
  /** The PosterDesign (validated again by the render page). */
  design: Record<string, unknown>
  /** Printed size: its id and physical size (portrait, mm) set the poster's ratio. */
  size: { id: string; widthMm: number; heightMm: number }
  /** Output size in px, orientation included (landscape: width > height). */
  pixels: { width: number; height: number }
  format: ImageFormat
  /** JPEG quality, 1–100. */
  quality: number
  /**
   * One poster of a set (from Méridien, whose L'Ensemble prints two). ShaderPaper's
   * backend never sends it; kept so the API stays Méridien's.
   */
  part?: string
}

export class JobError extends Error {}

export interface Size {
  width: number
  height: number
}

/** Same as the storefront's posterSize(): short side 1000 px, long side rounded. */
export function logicalSize(size: RenderJob['size'], landscape: boolean): Size {
  const short = Math.min(size.widthMm, size.heightMm)
  const long = Math.max(size.widthMm, size.heightMm)
  const longPx = Math.round((LOGICAL_SHORT_SIDE * long) / short)
  return landscape
    ? { width: longPx, height: LOGICAL_SHORT_SIDE }
    : { width: LOGICAL_SHORT_SIDE, height: longPx }
}

export const isLandscape = (pixels: Size) => pixels.width > pixels.height

/** Viewport and scale for a job. The capture is `viewport × scale`, within a pixel of `pixels`. */
export function renderGeometry(job: Pick<RenderJob, 'size' | 'pixels'>): { viewport: Size; scale: number } {
  const viewport = logicalSize(job.size, isLandscape(job.pixels))
  return { viewport, scale: job.pixels.width / viewport.width }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function integer(value: unknown, name: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new JobError(`${name} must be an integer between ${min} and ${max}`)
  }
  return value as number
}

/** Validates a request body; throws JobError with a message safe to return to the caller. */
export function parseJob(body: unknown, maxSidePx: number): RenderJob {
  if (!isObject(body)) throw new JobError('Body must be a JSON object')
  const { design, size, pixels, format = 'png', quality = 92, part } = body

  if (!isObject(design)) throw new JobError('design must be an object')
  if (JSON.stringify(design).length > MAX_DESIGN_BYTES) throw new JobError('design is too large')

  if (!isObject(size)) throw new JobError('size must be an object')
  if (typeof size.id !== 'string' || !/^[a-z0-9-]{1,32}$/i.test(size.id)) {
    throw new JobError('size.id must be 1–32 letters, digits or dashes')
  }
  if (!isObject(pixels)) throw new JobError('pixels must be an object')
  if (format !== 'png' && format !== 'jpeg') throw new JobError('format must be "png" or "jpeg"')
  if (part !== undefined && (typeof part !== 'string' || !/^[a-z]{1,16}$/.test(part))) {
    throw new JobError('part must be 1–16 lowercase letters')
  }

  const job: RenderJob = {
    design,
    size: {
      id: size.id,
      widthMm: integer(size.widthMm, 'size.widthMm', 10, 3000),
      heightMm: integer(size.heightMm, 'size.heightMm', 10, 3000),
    },
    pixels: {
      width: integer(pixels.width, 'pixels.width', 100, maxSidePx),
      height: integer(pixels.height, 'pixels.height', 100, maxSidePx),
    },
    format,
    quality: integer(quality, 'quality', 1, 100),
    ...(part ? { part } : {}),
  }

  // The output must have the poster's ratio, or the print would be stretched.
  const { viewport, scale } = renderGeometry(job)
  if (Math.abs(viewport.height * scale - job.pixels.height) > Math.max(2, job.pixels.height * 0.002)) {
    throw new JobError(
      `pixels ${job.pixels.width}×${job.pixels.height} don't match the ${viewport.width}:${viewport.height} ratio of size ${job.size.id}`,
    )
  }
  return job
}
