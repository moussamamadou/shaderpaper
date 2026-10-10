import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

/** The largest photo the storefront sends, once it has scaled it down (about 2 MB); base64 in JSON adds a third. */
export const POSTER_PHOTO_MAX_BYTES = 8 * 1024 * 1024

export const UploadPosterPhotoSchema = z.object({
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** The image, base64 (no data: prefix). */
  content: z.string().min(1).max(Math.ceil((POSTER_PHOTO_MAX_BYTES * 4) / 3) + 4),
})

export type UploadPosterPhotoSchema = z.infer<typeof UploadPosterPhotoSchema>

export const posterPhotoMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/poster-photos",
    method: "POST",
    bodyParser: { sizeLimit: "12mb" },
    middlewares: [validateAndTransformBody(UploadPosterPhotoSchema)],
  },
]
