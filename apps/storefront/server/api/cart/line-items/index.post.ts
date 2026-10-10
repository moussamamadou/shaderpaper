import { createError, defineEventHandler, readBody } from "h3"
import { addToCart } from "../../../utils/data/cart"

/** Upper bound for line-item metadata (a ShaderPaper design, `metadata.poster`, is well under 1 kB). */
const MAX_METADATA_BYTES = 64 * 1024

/** addToCart — adds a variant line item (creates the cart if needed). */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    variant_id: string
    quantity: number
    country_code: string
    metadata?: Record<string, unknown>
  }>(event)

  const metadata = body?.metadata
  if (metadata !== undefined) {
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
      throw createError({ statusCode: 400, message: "Line item metadata must be an object" })
    }
    if (JSON.stringify(metadata).length > MAX_METADATA_BYTES) {
      throw createError({ statusCode: 413, message: "Line item metadata is too large" })
    }
  }

  await addToCart(event, {
    variantId: body?.variant_id,
    quantity: body?.quantity,
    countryCode: body?.country_code,
    metadata,
  })

  return { success: true }
})
