import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import { ENSEMBLE_POSTER_HANDLE, ensemblePosterProductInput } from "../poster/catalog"

/**
 * Creates the L'Ensemble product (src/poster/catalog.ts) sold by the storefront's L'Ensemble Atelier.
 * Runs once with `medusa db:migrate`; skips a store that already has it.
 */
export default async function ensemble_poster_products({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: [ENSEMBLE_POSTER_HANDLE] },
  })
  if (existing.length) {
    logger.info(`The L'Ensemble product already exists (${ENSEMBLE_POSTER_HANDLE}), skipping.`)
    return
  }

  const {
    data: [store],
  } = await query.graph({
    entity: "store",
    fields: ["default_sales_channel_id", "supported_currencies.currency_code"],
  })
  const {
    data: [shippingProfile],
  } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  })
  if (!store?.default_sales_channel_id || !shippingProfile) {
    // A store that isn't set up yet: nothing to attach the product to.
    logger.warn(
      "L'Ensemble product not created: the store has no default sales channel or shipping profile."
    )
    return
  }

  const currencies = (store.supported_currencies ?? []).flatMap((c) =>
    c ? [c.currency_code] : []
  )
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        ensemblePosterProductInput({
          currencies,
          salesChannelId: store.default_sales_channel_id,
          shippingProfileId: shippingProfile.id,
        }),
      ],
    },
  })

  logger.info(
    `Created the L'Ensemble product: ${result
      .map((p) => `${p.handle} (${p.variants?.length ?? 0} variants)`)
      .join(", ")}; prices in ${currencies.join(", ")}.`
  )
}
