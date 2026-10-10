import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const RenderPosterPrintFilesSchema = z.object({
  /** Also re-render lines that already have a print file. */
  force: z.boolean().optional(),
})

export type RenderPosterPrintFilesSchema = z.infer<typeof RenderPosterPrintFilesSchema>

export const posterPrintFilesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/orders/:id/poster-print-files",
    method: "POST",
    middlewares: [validateAndTransformBody(RenderPosterPrintFilesSchema)],
  },
]
