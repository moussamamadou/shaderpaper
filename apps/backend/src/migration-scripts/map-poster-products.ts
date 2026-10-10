import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import {
  MAP_POSTER_DIGITAL_HANDLE,
  MAP_POSTER_HANDLE,
  posterProductsInput,
} from "../poster/catalog"

/**
 * Creates the custom map poster products (src/poster/catalog.ts) sold by the
 * storefront's poster builder. Runs once with `medusa db:migrate`; skips a
 * store that already has them.
 */
export default async function map_poster_products({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: [MAP_POSTER_HANDLE, MAP_POSTER_DIGITAL_HANDLE] },
  })
  if (existing.length) {
    logger.info(
      `Map poster products already exist (${existing.map((p) => p.handle).join(", ")}), skipping.`
    )
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
    // A store that isn't set up yet: nothing to attach the products to.
    logger.warn(
      "Map poster products not created: the store has no default sales channel or shipping profile."
    )
    return
  }

  const currencies = (store.supported_currencies ?? []).flatMap((c) =>
    c ? [c.currency_code] : []
  )
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: posterProductsInput({
        currencies,
        salesChannelId: store.default_sales_channel_id,
        shippingProfileId: shippingProfile.id,
      }),
    },
  })

  logger.info(
    `Created map poster products: ${result
      .map((p) => `${p.handle} (${p.variants?.length ?? 0} variants)`)
      .join(", ")}; prices in ${currencies.join(", ")}.`
  )
}
