import { randomUUID } from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IFileModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { POSTER_PHOTO_MAX_BYTES, type UploadPosterPhotoSchema } from "./middlewares"

/** What each image type starts with, so a file named .jpg that isn't one is refused. */
const SIGNATURES: Record<UploadPosterPhotoSchema["mime_type"], { ext: string; test: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", test: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
}

/**
 * A customer's photo for a poster (Le Trio's middle poster), stored with the File Module before the
 * design goes to the cart: the storefront scales it down first and keeps the returned URL in the design
 * (`design.photo.url`), from which the preview and, after the order, the print renderer draw it. Public
 * under an unguessable name, like the product images.
 */
export async function POST(req: MedusaRequest<UploadPosterPhotoSchema>, res: MedusaResponse) {
  const { mime_type, content } = req.validatedBody
  const bytes = Buffer.from(content, "base64")
  const kind = SIGNATURES[mime_type]
  if (!bytes.length || bytes.length > POSTER_PHOTO_MAX_BYTES) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "The photo must be a non-empty image of at most 8 MB")
  }
  if (!kind.test(bytes)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `The photo isn't a ${kind.ext.toUpperCase()} image`)
  }

  const file = await req.scope.resolve<IFileModuleService>(Modules.FILE).createFiles({
    filename: `posters/photos/${randomUUID()}.${kind.ext}`,
    mimeType: mime_type,
    content: bytes.toString("base64"),
    access: "public",
  })
  res.status(201).json({ photo: { id: file.id, url: file.url } })
}
