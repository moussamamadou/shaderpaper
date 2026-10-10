import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import { DUO_POSTER_HANDLE, duoPosterProductInput } from "../poster/catalog"

/**
 * Creates the Duo product (src/poster/catalog.ts) sold by the storefront's Duo Atelier. Runs once
 * with `medusa db:migrate`; skips a store that already has it.
 */
export default async function duo_poster_products({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: [DUO_POSTER_HANDLE] },
  })
  if (existing.length) {
    logger.info(`The Duo product already exists (${DUO_POSTER_HANDLE}), skipping.`)
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
      "Duo product not created: the store has no default sales channel or shipping profile."
    )
    return
  }

  const currencies = (store.supported_currencies ?? []).flatMap((c) =>
    c ? [c.currency_code] : []
  )
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        duoPosterProductInput({
          currencies,
          salesChannelId: store.default_sales_channel_id,
          shippingProfileId: shippingProfile.id,
        }),
      ],
    },
  })

  logger.info(
    `Created the Duo product: ${result
      .map((p) => `${p.handle} (${p.variants?.length ?? 0} variants)`)
      .join(", ")}; prices in ${currencies.join(", ")}.`
  )
}
