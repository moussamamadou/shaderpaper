import { MedusaContainer } from "@medusajs/framework"
import type { IFulfillmentModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  POSTER_COLLECTIONS,
  posterHandle,
  SHADER_POSTERS,
  shaderPosterProductsInput,
  type PosterCategory,
} from "../poster/catalog"

/**
 * ShaderPaper's store: the commerce setup of Méridien's initial-data-seed (itself Medusa's starter
 * seed), without its demo apparel products, then the six poster collections and the 54 poster
 * products (src/poster/catalog.ts).
 *
 * Runs once with `medusa db:migrate` (a migration script), and again with `pnpm seed`
 * (`medusa exec`). Idempotent: each piece is looked up first (by name, handle or country) and only
 * created when missing, so a second run changes nothing; a catalogue grown since adds its new posters.
 *
 * Placeholders (business input, copied from Méridien, which copied Medusa's starter):
 * - markets: one region "Europe" in EUR for gb, de, dk, se, fr, es, it; store currencies EUR (default)
 *   and USD. GB in a EUR region is the starter's choice, not a decision.
 * - tax regions for those countries with the system provider and no rates.
 * - stock location "European Warehouse" (Copenhagen) with Medusa's manual fulfilment provider:
 *   posters are made to order (no inventory), the location only carries the shipping options.
 * - shipping options "Standard Shipping" and "Express Shipping" at 10 EUR / 10 USD each: THE STARTER'S
 *   PLACEHOLDER AMOUNTS, not ShaderPaper's shipping prices. Their descriptions are neutral on purpose
 *   (Méridien's "Ship in 2-3 days." / "Ship in 24 hours." are starter text, not a delivery promise).
 * - payment: Medusa's system provider (manual, takes no payment), plus Stripe when STRIPE_API_KEY is
 *   set at seed time (see medusa-config.ts).
 */

const COUNTRIES = ["gb", "de", "dk", "se", "fr", "es", "it"]
const SALES_CHANNEL_NAME = "Default Sales Channel"
const API_KEY_TITLE = "Default Publishable API Key"
const STORE_NAME = "Default Store"
const REGION_NAME = "Europe"
const STOCK_LOCATION_NAME = "European Warehouse"
const FULFILLMENT_SET_NAME = "European Warehouse delivery"
const SERVICE_ZONE_NAME = "Europe"
/** Placeholder amounts (business input): the starter's 10 per order, in each currency. */
const SHIPPING_AMOUNT = 10
const SHIPPING_OPTIONS = [
  { name: "Standard Shipping", label: "Standard", code: "standard" },
  { name: "Express Shipping", label: "Express", code: "express" },
]
const PRODUCT_BATCH = 10

export default async function initial_data_seed({ container }: { container: MedusaContainer }) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

  // ---- Sales channel, publishable key, store ----
  logger.info("Seeding store data...")
  const {
    data: [existingChannel],
  } = await query.graph({ entity: "sales_channel", fields: ["id"], filters: { name: SALES_CHANNEL_NAME } })
  const salesChannelId: string =
    existingChannel?.id ??
    (
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: SALES_CHANNEL_NAME, description: "Created by Medusa" }] },
      })
    ).result[0].id

  const {
    data: [existingKey],
  } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "sales_channels.id"],
    filters: { type: "publishable", title: API_KEY_TITLE },
  })
  const apiKey: { id: string; token: string; channelIds: string[] } = existingKey
    ? {
        id: existingKey.id,
        token: existingKey.token,
        channelIds: (existingKey.sales_channels ?? []).flatMap((channel) => (channel ? [channel.id] : [])),
      }
    : {
        ...(
          await createApiKeysWorkflow(container).run({
            input: { api_keys: [{ title: API_KEY_TITLE, type: "publishable", created_by: "" }] },
          })
        ).result[0],
        channelIds: [],
      }
  if (!apiKey.channelIds.includes(salesChannelId)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey.id, add: [salesChannelId] },
    })
  }

  const supportedCurrencies = [
    { currency_code: "eur", is_default: true },
    { currency_code: "usd", is_default: false },
  ]
  // Medusa creates an empty default store when the app first starts; reuse it if it exists.
  const {
    data: [existingStore],
  } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id", "supported_currencies.currency_code"],
  })
  if (!existingStore) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          { name: STORE_NAME, supported_currencies: supportedCurrencies, default_sales_channel_id: salesChannelId },
        ],
      },
    })
  } else {
    const codes = (existingStore.supported_currencies ?? []).map((c) => c?.currency_code)
    if (existingStore.default_sales_channel_id !== salesChannelId || !["eur", "usd"].every((c) => codes.includes(c))) {
      await updateStoresWorkflow(container).run({
        input: {
          selector: { id: existingStore.id },
          update: { supported_currencies: supportedCurrencies, default_sales_channel_id: salesChannelId },
        },
      })
    }
  }

  // ---- Region, tax regions ----
  logger.info("Seeding region data...")
  const {
    data: [existingRegion],
  } = await query.graph({ entity: "region", fields: ["id"], filters: { name: REGION_NAME } })
  let regionId: string | undefined = existingRegion?.id
  if (!regionId) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: "eur",
            countries: COUNTRIES,
            payment_providers: ["pp_system_default", ...(process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : [])],
          },
        ],
      },
    })
    regionId = result[0].id
  }

  const { data: taxRegions } = await query.graph({ entity: "tax_region", fields: ["country_code"] })
  const taxed = new Set(taxRegions.map((t) => t.country_code?.toLowerCase()))
  const untaxed = COUNTRIES.filter((code) => !taxed.has(code))
  if (untaxed.length) {
    await createTaxRegionsWorkflow(container).run({
      input: untaxed.map((country_code) => ({ country_code, provider_id: "tp_system" })),
    })
  }

  // ---- Stock location, fulfilment, shipping options ----
  logger.info("Seeding stock location and fulfillment data...")
  const {
    data: [existingLocation],
  } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_providers.id", "fulfillment_sets.id", "sales_channels.id"],
    filters: { name: STOCK_LOCATION_NAME },
  })
  const ids = (list?: ({ id: string } | null)[] | null) => (list ?? []).flatMap((item) => (item ? [item.id] : []))
  const stockLocation: { id: string; providerIds: string[]; setIds: string[]; channelIds: string[] } = existingLocation
    ? {
        id: existingLocation.id,
        providerIds: ids(existingLocation.fulfillment_providers),
        setIds: ids(existingLocation.fulfillment_sets),
        channelIds: ids(existingLocation.sales_channels),
      }
    : {
        id: (
          await createStockLocationsWorkflow(container).run({
            input: {
              locations: [{ name: STOCK_LOCATION_NAME, address: { city: "Copenhagen", country_code: "DK", address_1: "" } }],
            },
          })
        ).result[0].id,
        providerIds: [],
        setIds: [],
        channelIds: [],
      }
  if (!stockLocation.providerIds.includes("manual_manual")) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  }

  const {
    data: [existingProfile],
  } = await query.graph({ entity: "shipping_profile", fields: ["id"], filters: { type: "default" } })
  // Created by a core migration on a fresh database; made here only if it is missing.
  const shippingProfileId: string =
    existingProfile?.id ??
    (
      await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
      })
    ).result[0].id

  let [fulfillmentSet] = await fulfillmentModuleService.listFulfillmentSets(
    { name: FULFILLMENT_SET_NAME },
    { relations: ["service_zones"] }
  )
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: SERVICE_ZONE_NAME,
          geo_zones: COUNTRIES.map((country_code) => ({ country_code, type: "country" as const })),
        },
      ],
    })
  }
  if (!stockLocation.setIds.includes(fulfillmentSet.id)) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
  }

  const serviceZone = fulfillmentSet.service_zones.find((zone) => zone.name === SERVICE_ZONE_NAME) ?? fulfillmentSet.service_zones[0]
  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["name"],
    filters: { service_zone_id: serviceZone.id },
  })
  const missingOptions = SHIPPING_OPTIONS.filter((option) => !existingOptions.some((o) => o.name === option.name))
  if (missingOptions.length) {
    await createShippingOptionsWorkflow(container).run({
      input: missingOptions.map((option) => ({
        name: option.name,
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfileId,
        type: {
          label: option.label,
          // Neutral on purpose: no delivery time is promised until it is known (business input).
          description: "Delivery time to be confirmed.",
          code: option.code,
        },
        // Placeholder amounts (business input).
        prices: [
          { currency_code: "usd", amount: SHIPPING_AMOUNT },
          { currency_code: "eur", amount: SHIPPING_AMOUNT },
          { region_id: regionId, amount: SHIPPING_AMOUNT },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    })
  }

  if (!stockLocation.channelIds.includes(salesChannelId)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannelId] },
    })
  }
  logger.info("Finished seeding stock location and fulfillment data.")

  // ---- Collections ----
  logger.info("Seeding poster collections...")
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: POSTER_COLLECTIONS.map((c) => c.handle) },
  })
  const newCollections = POSTER_COLLECTIONS.filter((c) => !existingCollections.some((e) => e.handle === c.handle))
  const createdCollections = newCollections.length
    ? (
        await createCollectionsWorkflow(container).run({
          input: { collections: newCollections.map(({ title, handle }) => ({ title, handle })) },
        })
      ).result
    : []
  const collectionIds: Partial<Record<PosterCategory, string>> = {}
  for (const collection of POSTER_COLLECTIONS) {
    const found = [...existingCollections, ...createdCollections].find((c) => c.handle === collection.handle)
    if (found) collectionIds[collection.category] = found.id
  }

  // ---- Poster products ----
  logger.info("Seeding poster products...")
  const handles = SHADER_POSTERS.map((poster) => posterHandle(poster.id))
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["handle"],
    filters: { handle: handles },
  })
  const existing = new Set(existingProducts.map((p) => p.handle))
  const newPosters = SHADER_POSTERS.filter((poster) => !existing.has(posterHandle(poster.id)))
  const {
    data: [store],
  } = await query.graph({ entity: "store", fields: ["supported_currencies.currency_code"] })
  const currencies = (store?.supported_currencies ?? []).flatMap((c) => (c ? [c.currency_code] : []))

  let created = 0
  for (let i = 0; i < newPosters.length; i += PRODUCT_BATCH) {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: shaderPosterProductsInput(
          { currencies, salesChannelId: salesChannelId, shippingProfileId, collectionIds },
          newPosters.slice(i, i + PRODUCT_BATCH)
        ),
      },
    })
    created += result.length
  }

  logger.info(
    `ShaderPaper seed done: ${createdCollections.length} collection(s) and ${created} poster product(s) created ` +
      `(${existing.size} already there), prices in ${currencies.join(", ")}. Publishable key: ${apiKey.token}`
  )
}
