import { MedusaError } from "@medusajs/framework/utils"

import type { PosterPrintItem } from "./print-files"
import { printPixels } from "./print-files"

/** Client of the print renderer service (apps/print-renderer). */

/** A render takes 15–20 s; leave room for a short queue. */
const RENDER_TIMEOUT_MS = 5 * 60 * 1000

export type PrintRendererConfig = { url: string; token?: string }

/** From PRINT_RENDERER_URL / PRINT_RENDERER_TOKEN; null when the renderer isn't set up. */
export function printRendererConfig(env: NodeJS.ProcessEnv = process.env): PrintRendererConfig | null {
  const url = env.PRINT_RENDERER_URL?.trim()
  if (!url) return null
  return { url: url.replace(/\/+$/, ""), token: env.PRINT_RENDERER_TOKEN?.trim() || undefined }
}

/** The renderer's request body (apps/print-renderer/README.md, API). */
export function renderRequestBody(item: PosterPrintItem) {
  return {
    design: item.design,
    size: { id: item.size.id, widthMm: item.size.widthMm, heightMm: item.size.heightMm },
    pixels: printPixels(item),
    format: "png" as const,
  }
}

export type RenderedImage = { image: Buffer; width: number; height: number }

export async function renderPrintImage(
  config: PrintRendererConfig,
  item: PosterPrintItem,
  fetchImpl: typeof fetch = fetch
): Promise<RenderedImage> {
  const response = await fetchImpl(`${config.url}/render`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify(renderRequestBody(item)),
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Print renderer answered ${response.status}${body?.error ? `: ${body.error}` : ""}`
    )
  }
  return {
    image: Buffer.from(await response.arrayBuffer()),
    width: Number(response.headers.get("x-poster-width")),
    height: Number(response.headers.get("x-poster-height")),
  }
}
