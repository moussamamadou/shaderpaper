import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { missingProdigiSkus, prodigiSettings } from "../../../../poster/prodigi"

/**
 * Whether orders can be sent to Prodigi: `{ configured, env, skusMissing, reason? }`. Reads the
 * environment and the catalogue only; it does not call Prodigi.
 */
export async function GET(_req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const settings = prodigiSettings()
  res.json({
    configured: settings.configured,
    env: settings.env,
    skusMissing: missingProdigiSkus(),
    ...(settings.configured ? {} : { reason: settings.reason }),
  })
}
