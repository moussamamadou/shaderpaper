import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IFileModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { posterMetadata, posterParts, type PosterPart, type PosterPrintFile } from "../../../../../poster/print-files"
import { renderPosterPrintFilesWorkflow } from "../../../../../workflows/render-poster-print-files"
import type { RenderPosterPrintFilesSchema } from "./middlewares"

/** The order's custom posters, one row per print (each poster of a set), with a download URL for each file. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "items.id", "items.variant_title", "items.quantity", "items.metadata"],
    filters: { id: req.params.id },
  })
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order with id: ${req.params.id} was not found`)
  }

  const fileModule = req.scope.resolve<IFileModuleService>(Modules.FILE)
  const lines = (order.items ?? []).flatMap((item) => {
    const poster = item && posterMetadata(item.metadata)
    return item && poster ? [{ item, poster }] : []
  })

  // Private files: a fresh (possibly expiring) download URL.
  const withUrl = async (file?: PosterPrintFile) =>
    file
      ? { ...file, url: await fileModule.retrieveFile(file.file_id).then((f) => f.url).catch(() => null) }
      : null
  const rows = lines.flatMap(({ item, poster }) => {
    const parts: (PosterPart | null)[] = poster.design ? posterParts(poster.design) : []
    return (parts.length ? parts : [null]).map((part) => ({ item, poster, part }))
  })

  const posters = await Promise.all(
    rows.map(async ({ item, poster, part }) => ({
      item_id: item.id,
      part,
      title: poster.title ?? null,
      variant_title: item.variant_title ?? null,
      quantity: item.quantity,
      thumbnail: poster.thumbnail ?? null,
      print_file: await withUrl(part ? poster.print_files?.[part] : poster.print_file),
      print_error: poster.print_error && (!part || !poster.print_error.part || poster.print_error.part === part) ? poster.print_error : null,
    }))
  )

  res.json({ posters })
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
