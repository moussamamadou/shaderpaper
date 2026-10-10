import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IFileModuleService, IOrderModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { prodigiClient, ProdigiError, prodigiErrorStatus } from "../../../../../poster/prodigi"
import { submitOrderToProdigi } from "../../../../../poster/prodigi-submit"
import type { SubmitProdigiOrderSchema } from "./middlewares"

/**
 * Sends a placed order's rendered posters to Prodigi (sandbox unless PRODIGI_ENV=live in production).
 * An admin's manual action: nothing else calls Prodigi. 409 with a message when Prodigi is off, a SKU
 * or a print file is missing, or the order was already sent (see src/poster/prodigi-submit.ts).
 */
export async function POST(req: AuthenticatedMedusaRequest<SubmitProdigiOrderSchema>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const prodigi = await submitOrderToProdigi(
      {
        query: req.scope.resolve(ContainerRegistrationKeys.QUERY),
        files: req.scope.resolve<IFileModuleService>(Modules.FILE),
        orders: req.scope.resolve<IOrderModuleService>(Modules.ORDER),
        client: () => prodigiClient(),
      },
      req.params.id,
      { shippingMethod: req.validatedBody?.shipping_method }
    )
    logger.info(`Order ${req.params.id} sent to Prodigi (${prodigi.env}): ${prodigi.order_id}, ${prodigi.outcome}`)
    res.json({ prodigi })
  } catch (error) {
    if (!(error instanceof ProdigiError)) throw error
    const status = prodigiErrorStatus(error)
    if (status >= 500) logger.warn(`Prodigi submission of order ${req.params.id} failed: ${error.message}`)
    res.status(status).json({
      type: error.kind,
      message: error.message,
      ...(error.outcome ? { outcome: error.outcome } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
    })
  }
}
