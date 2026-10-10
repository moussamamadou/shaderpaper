import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IFileModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { posterMetadata, type PosterPrintFile } from "../../../../../poster/print-files"
import { renderPosterPrintFilesWorkflow } from "../../../../../workflows/render-poster-print-files"
import type { RenderPosterPrintFilesSchema } from "./middlewares"

/**
 * The order's posters, one row per line, with a download URL for each print file, and what was sent
 * to Prodigi (`order.metadata.prodigi`, or `prodigi_error`).
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "metadata", "items.id", "items.variant_title", "items.quantity", "items.metadata"],
    filters: { id: req.params.id },
  })
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id: ${req.params.id} was not found`)
  }

  const fileModule = req.scope.resolve<IFileModuleService>(Modules.FILE)
  // Private files: a fresh (possibly expiring) download URL.
  const withUrl = async (file?: PosterPrintFile) =>
    file
      ? { ...file, url: await fileModule.retrieveFile(file.file_id).then((f) => f.url).catch(() => null) }
      : null

  const lines = (order.items ?? []).flatMap((item) => {
    const poster = item && posterMetadata(item.metadata)
    return item && poster ? [{ item, poster }] : []
  })
  const posters = await Promise.all(
    lines.map(async ({ item, poster }) => ({
      item_id: item.id,
      title: poster.title ?? null,
      poster_id: typeof poster.design?.id === "string" ? poster.design.id : null,
      variant_title: item.variant_title ?? null,
      quantity: item.quantity,
      thumbnail: poster.thumbnail ?? null,
      print_file: await withUrl(poster.print_file),
      print_error: poster.print_error ?? null,
    }))
  )

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  res.json({ posters, prodigi: metadata.prodigi ?? null, prodigi_error: metadata.prodigi_error ?? null })
}

/** Renders the order's missing print files (all of them with `force`). */
export async function POST(
  req: AuthenticatedMedusaRequest<RenderPosterPrintFilesSchema>,
  res: MedusaResponse
) {
  const { result } = await renderPosterPrintFilesWorkflow(req.scope).run({
    input: { order_id: req.params.id, force: req.validatedBody.force },
  })
  res.json(result)
}
