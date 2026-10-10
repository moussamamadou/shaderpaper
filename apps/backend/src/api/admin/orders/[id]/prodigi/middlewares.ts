import { validateAndTransformBody, type MiddlewareRoute } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const SubmitProdigiOrderSchema = z.object({
  /** Prodigi's shipping method; by default Express for Medusa's "Express" shipping, else Standard. */
  shipping_method: z.enum(["Budget", "Standard", "StandardPlus", "Express", "Overnight"]).optional(),
})

export type SubmitProdigiOrderSchema = z.infer<typeof SubmitProdigiOrderSchema>

export const prodigiOrderMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/orders/:id/prodigi",
    method: "POST",
    middlewares: [validateAndTransformBody(SubmitProdigiOrderSchema)],
  },
]
