import { ProductStatus } from "@medusajs/framework/utils"
import type { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"

import postersJson from "./posters.json"

/**
 * ShaderPaper's catalogue: one product per poster of the shader catalogue (explorations/index.html, tab
 * Posters), one variant per size × frame. The buyer's design (knobs, palette, colour strength, seed)
 * travels in the line item's metadata (`metadata.poster`, `design.kind: "shader"`), and a print file is
 * rendered from it once the order is placed (src/poster/print-files.ts).
 *
 * The poster list is generated: `posters.json` comes from `scripts/extract-posters.mjs` (the catalogue's
 * knob definitions merged with the gallery's names, blurbs, categories and colour-strength picks). Do not
 * edit it by hand; run the script again.
 *
 * Sizes, frames and prices are copied from MapAndSky (Méridien)'s catalogue, see POSTER_PRICES.
 */

/** `product.metadata.builder` of every poster: the storefront opens the shader customiser for it. */
export const SHADER_BUILDER = "shader"

/** A colour strength: natural, balanced or vivid (the catalogue's "lvl"). */
export type ShaderStrength = "n" | "b" | "v"

/** A knob: a slider between two labelled ends, or a choice between `steps` options. Values are 0..1. */
export type ShaderKnob =
  | { n: string; lo: string; hi: string; d: number }
  | { n: string; opts: string[]; steps: number; d: number }

/** The gallery's category ids (also each poster's collection, see POSTER_COLLECTIONS). */
export type PosterCategory = "geo" | "pattern" | "lines" | "organic" | "light" | "material"

/** A poster of the catalogue, as generated in posters.json. */
export type ShaderPoster = {
  /** The catalogue's system id, e.g. `glass`, `k_cpack`. The render page draws the poster from it. */
  id: string
  name: string
  blurb: string
  category: PosterCategory
  /** The recommended colour strength. */
  strength: ShaderStrength
  /** Position in the gallery (featured order). */
  order: number
  /** The four knobs, in the catalogue's order (`design.knobs[i]` sets knob i). */
  knobs: ShaderKnob[]
}

export const SHADER_POSTERS = postersJson as ShaderPoster[]

/** The gallery's six categories, as product collections (handle, title), in the gallery's order. */
export const POSTER_COLLECTIONS: { category: PosterCategory; handle: string; title: string }[] = [
  { category: "geo", handle: "geometric", title: "Geometric" },
  { category: "pattern", handle: "pattern", title: "Pattern & tiling" },
  { category: "lines", handle: "lines", title: "Lines & op-art" },
  { category: "organic", handle: "organic", title: "Organic & fluid" },
  { category: "light", handle: "light", title: "Light & gradient" },
  { category: "material", handle: "material", title: "3D & material" },
]

/**
 * A poster's product handle: its id, with `_` as `-` because Medusa refuses underscores in handles
 * (`k_cpack` → `k-cpack`). `product.metadata.shader.id` keeps the catalogue id.
 */
export const posterHandle = (id: string) => id.replace(/_/g, "-")

/** A poster by catalogue id. */
export const findShaderPoster = (id: unknown) => SHADER_POSTERS.find((poster) => poster.id === id)

export type PosterSize = {
  /** Size id, as in variant metadata `poster_size` and in SKUs. */
  id: string
  title: string
  widthMm: number
  heightMm: number
  /**
   * Print file size in portrait, in px (Méridien's values). Printed sizes follow the print lab's
   * 12×16, 18×24 and 24×32 in formats (3:4, like the poster); 60 × 80 cm is at 250 DPI so the file
   * stays within a software-rendered canvas (8192 px).
   */
  printPx: [number, number]
}

/** Méridien's three 3:4 sizes. Shader posters are portrait only. */
export const POSTER_SIZES: PosterSize[] = [
  { id: "30x40", title: "30 × 40 cm", widthMm: 300, heightMm: 400, printPx: [3600, 4800] },
  { id: "45x60", title: "45 × 60 cm", widthMm: 450, heightMm: 600, printPx: [5400, 7200] },
  { id: "60x80", title: "60 × 80 cm", widthMm: 600, heightMm: 800, printPx: [6000, 8000] },
]

/** Méridien's frames. Ids are variant metadata `poster_frame` and the SKU's last part. */
export const POSTER_FRAMES = [
  { id: "none", title: "No frame" },
  { id: "black", title: "Black" },
  { id: "white", title: "White" },
  { id: "oak", title: "Natural wood" },
] as const

export type PosterFrameId = (typeof POSTER_FRAMES)[number]["id"]

export const findPosterSize = (id: unknown) => POSTER_SIZES.find((size) => size.id === id)

/** What each poster variant carries in its metadata (read by the storefront and the print workflow). */
export type PosterVariantMetadata = {
  poster_size: string
  poster_frame: string
  width_mm: number
  height_mm: number
}

type Prices = Record<string, number | null>

/**
 * PLACEHOLDER PRICES (business input). These are Méridien's prices for its own map and star posters,
 * copied unchanged for the same sizes and frames: decimal amounts per currency (39 = €39.00), set by
 * Méridien at about twice Prodigi's cost (print + tracked delivery, before VAT; Prodigi sandbox quotes of
 * 2026-09-24). EUR, GBP and AUD include VAT/GST; USD and CAD exclude sales tax; `null` means not sold in
 * that currency. ShaderPaper's paper, margin and positioning are undecided: replace them before selling.
 * Only the store's currencies are used (EUR and USD in the seed).
 */
export const POSTER_PRICES: Record<string, { print: Prices; frame: Prices; wood: Prices }> = {
  "30x40": {
    print: { eur: 39, gbp: 35, usd: 49, aud: 69, cad: 85 },
    frame: { eur: 119, gbp: 99, usd: 139, aud: 169, cad: null },
    wood: { eur: 129, gbp: 109, usd: 149, aud: 179, cad: null },
  },
  "45x60": {
    print: { eur: 59, gbp: 49, usd: 69, aud: 95, cad: 95 },
    frame: { eur: 149, gbp: 135, usd: 169, aud: 229, cad: null },
    wood: { eur: 159, gbp: 145, usd: 179, aud: 239, cad: null },
  },
  "60x80": {
    print: { eur: 79, gbp: 69, usd: 79, aud: 129, cad: 119 },
    frame: { eur: 179, gbp: 169, usd: 209, aud: 309, cad: null },
    wood: { eur: 189, gbp: 179, usd: 219, aud: 319, cad: null },
  },
}

/**
 * Prodigi product SKU for each size and frame: BUSINESS INPUT, all `null` until chosen. Which Prodigi
 * paper (e.g. enhanced matte art paper vs. a fine-art paper) and which frame range ShaderPaper prints on
 * is undecided; Méridien never chose either (it has no Prodigi client). A Prodigi SKU looks like
 * `GLOBAL-CFPM-16X20` (see https://www.prodigi.com/print-api/docs/reference/ and the product's page in
 * Prodigi's dashboard); check each with `GET /v4.0/products/{sku}` (src/poster/prodigi.ts, getProduct)
 * for its print area and its required attributes (framed products usually need a `color`, see
 * PRODIGI_ITEM_ATTRIBUTES). The Prodigi client refuses to submit an order while a SKU it needs is null.
 */
export const PRODIGI_SKUS: Record<string, Record<PosterFrameId, string | null>> = {
  "30x40": { none: null, black: null, white: null, oak: null },
  "45x60": { none: null, black: null, white: null, oak: null },
  "60x80": { none: null, black: null, white: null, oak: null },
}

/**
 * Prodigi item attributes per frame (e.g. `{ color: "black" }`): BUSINESS INPUT, empty until the SKUs
 * above are chosen. The valid values come from `GET /v4.0/products/{sku}` for each chosen SKU.
 */
export const PRODIGI_ITEM_ATTRIBUTES: Record<PosterFrameId, Record<string, string>> = {
  none: {},
  black: {},
  white: {},
  oak: {},
}

/** A poster variant's prices in the given store currencies (none where it isn't sold). */
export function posterVariantPrices(sizeId: string, frameId: string, currencies: string[]) {
  const size = POSTER_PRICES[sizeId]
  const table = frameId === "none" ? size?.print : frameId === "oak" ? size?.wood : size?.frame
  return currencies.flatMap((code) => {
    const amount = table?.[code]
    return typeof amount === "number" ? [{ currency_code: code, amount }] : []
  })
}

/** A variant's SKU: `SP-<ID>-<SIZE>-<FRAME>`, uppercased (`SP-GLASS-30X40-NONE`). */
export const posterSku = (posterId: string, sizeId: string, frameId: string) =>
  `SP-${posterId}-${sizeId}-${frameId}`.toUpperCase()

/** The size id in a poster SKU (`SP-K_CPACK-45X60-OAK` → `45x60`), for a line whose variant is gone. */
export function sizeFromSku(sku: unknown): string | undefined {
  const match = typeof sku === "string" ? /^SP-.+-(\d+X\d+)-[A-Z]+$/.exec(sku) : null
  return match ? match[1].toLowerCase() : undefined
}

/** The frame id in a poster SKU (`SP-GLASS-45X60-OAK` → `oak`). */
export function frameFromSku(sku: unknown): string | undefined {
  const match = typeof sku === "string" ? /^SP-.+-\d+X\d+-([A-Z]+)$/.exec(sku) : null
  return match ? match[1].toLowerCase() : undefined
}

/** `product.metadata` of a poster: what the storefront's customiser needs. */
export type ShaderProductMetadata = {
  builder: typeof SHADER_BUILDER
  shader: { id: string; strength: ShaderStrength }
  knobs: ShaderKnob[]
  category: PosterCategory
}

type ProductContext = {
  /** Store currencies to price in; currencies missing from the price table are skipped. */
  currencies: string[]
  salesChannelId: string
  shippingProfileId: string
  /** Collection id per category (POSTER_COLLECTIONS). */
  collectionIds: Partial<Record<PosterCategory, string>>
}

/** One poster's product, as `createProductsWorkflow` input: 12 variants (3 sizes × 4 frames). */
export function shaderPosterProductInput(poster: ShaderPoster, ctx: ProductContext): CreateProductWorkflowInputDTO {
  const metadata: ShaderProductMetadata = {
    builder: SHADER_BUILDER,
    shader: { id: poster.id, strength: poster.strength },
    knobs: poster.knobs,
    category: poster.category,
  }
  return {
    status: ProductStatus.PUBLISHED,
    title: poster.name,
    handle: posterHandle(poster.id),
    description: poster.blurb,
    // Served by the storefront (apps/storefront/public/posters), hence relative.
    thumbnail: `/posters/${poster.id}.webp`,
    metadata,
    collection_id: ctx.collectionIds[poster.category],
    sales_channels: [{ id: ctx.salesChannelId }],
    shipping_profile_id: ctx.shippingProfileId,
    options: [
      { title: "Size", values: POSTER_SIZES.map((size) => size.title) },
      { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
    ],
    variants: POSTER_SIZES.flatMap((size) =>
      POSTER_FRAMES.map((frame) => ({
        title: `${size.title} / ${frame.title}`,
        sku: posterSku(poster.id, size.id, frame.id),
        manage_inventory: false,
        options: { Size: size.title, Frame: frame.title },
        metadata: {
          poster_size: size.id,
          poster_frame: frame.id,
          width_mm: size.widthMm,
          height_mm: size.heightMm,
        } satisfies PosterVariantMetadata,
        prices: posterVariantPrices(size.id, frame.id, ctx.currencies),
      }))
    ),
  }
}

/** Every poster's product (or those of `posters`), as `createProductsWorkflow` input. */
export function shaderPosterProductsInput(
  ctx: ProductContext,
  posters: ShaderPoster[] = SHADER_POSTERS
): CreateProductWorkflowInputDTO[] {
  return posters.map((poster) => shaderPosterProductInput(poster, ctx))
}
