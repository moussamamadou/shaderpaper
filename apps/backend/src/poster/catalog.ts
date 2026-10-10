import { ProductStatus } from "@medusajs/framework/utils"
import type { CreateProductWorkflowInputDTO } from "@medusajs/framework/types"

/**
 * Custom map posters, designed in the storefront's poster builder
 * (apps/storefront/app/poster). One variant per size × frame; the customer's
 * design travels in the line item's metadata (`metadata.poster`), and a print
 * file is rendered from it once the order is placed.
 *
 * The digital file is its own product: Medusa decides whether a line item needs
 * shipping from its product's shipping profile, and a download ships nothing.
 */

export const MAP_POSTER_HANDLE = "map-poster"
/** The star map (« Carte du ciel »), designed in the storefront's star Atelier (apps/storefront/app/atelier). */
export const STAR_POSTER_HANDLE = "star-poster"
/** `product.metadata.builder` of the star map: the storefront sends its page to the Atelier. */
export const STAR_POSTER_BUILDER = "star-atelier"
/** Le Duo (two places or skies on one sheet), designed in the storefront's Duo Atelier. */
export const DUO_POSTER_HANDLE = "duo-poster"
/** `product.metadata.builder` of the Duo: the storefront sends its page to the Duo Atelier. */
export const DUO_POSTER_BUILDER = "duo-atelier"
/** L'Ensemble (the star map and the city map of one place and moment, two posters), designed in its Atelier. */
export const ENSEMBLE_POSTER_HANDLE = "ensemble-poster"
/** `product.metadata.builder` of L'Ensemble: the storefront sends its page to the L'Ensemble Atelier. */
export const ENSEMBLE_POSTER_BUILDER = "ensemble-atelier"
/** Le Trio (L'Ensemble's pair with the customer's photo between them, three posters), designed in its Atelier. */
export const TRIO_POSTER_HANDLE = "trio-poster"
/** `product.metadata.builder` of Le Trio: the storefront sends its page to the Trio Atelier. */
export const TRIO_POSTER_BUILDER = "trio-atelier"
export const MAP_POSTER_DIGITAL_HANDLE = "map-poster-digital"
/** `product.metadata.builder`: the storefront sends these products' pages to the builder. */
export const MAP_POSTER_BUILDER = "map-poster"

export type PosterSize = {
  /** Also the builder's size id (`design.product.sizeId`). */
  id: string
  title: string
  widthMm: number
  heightMm: number
  /**
   * Print file size in portrait, in px. Printed sizes follow the print lab's
   * 12×16, 18×24 and 24×32 in formats (3:4, like the poster); 60 × 80 cm is at
   * 250 DPI so the file stays within a software-rendered canvas (8192 px).
   */
  printPx: [number, number]
  digital?: boolean
}

export const POSTER_SIZES: PosterSize[] = [
  { id: "30x40", title: "30 × 40 cm", widthMm: 300, heightMm: 400, printPx: [3600, 4800] },
  { id: "45x60", title: "45 × 60 cm", widthMm: 450, heightMm: 600, printPx: [5400, 7200] },
  { id: "60x80", title: "60 × 80 cm", widthMm: 600, heightMm: 800, printPx: [6000, 8000] },
  { id: "digital", title: "Digital file", widthMm: 300, heightMm: 400, printPx: [3600, 4800], digital: true },
]

/** Also the builder's frame ids (`design.product.frameId`). */
export const POSTER_FRAMES = [
  { id: "none", title: "No frame" },
  { id: "black", title: "Black" },
  { id: "white", title: "White" },
  { id: "oak", title: "Natural wood" },
] as const

/**
 * Star map sizes (v4, the storefront's star Atelier): the three 3:4 prints and Prodigi's three square
 * prints (30 × 30, 40 × 40 and 50 × 50 cm, 12, 16 and 20 in, at 300 DPI). The star map is never landscape.
 */
export const STAR_POSTER_SIZES: PosterSize[] = [
  ...POSTER_SIZES.filter((size) => !size.digital),
  { id: "30x30", title: "30 × 30 cm", widthMm: 300, heightMm: 300, printPx: [3600, 3600] },
  { id: "40x40", title: "40 × 40 cm", widthMm: 400, heightMm: 400, printPx: [4800, 4800] },
  { id: "50x50", title: "50 × 50 cm", widthMm: 500, heightMm: 500, printPx: [6000, 6000] },
]

/** A size by id, map or star (the square ones are star map sizes). */
export const findPosterSize = (id: unknown) =>
  POSTER_SIZES.find((size) => size.id === id) ?? STAR_POSTER_SIZES.find((size) => size.id === id)

/** What each poster variant carries in its metadata (read by the storefront and the print workflow). */
export type PosterVariantMetadata = {
  poster_size: string
  poster_frame: string
  width_mm: number
  height_mm: number
  digital?: boolean
}

type Prices = Record<string, number | null>

/**
 * Prices per currency, as decimal amounts (39 = €39.00, stored as-is): at least
 * twice Prodigi's cost for the poster (print + tracked delivery, before VAT;
 * sandbox quotes of 2026-09-24 from the lab that serves each region, CAD at
 * 1.40 per USD). EUR, GBP and AUD include VAT/GST, like consumer prices must;
 * USD and CAD exclude sales tax. `null`: not sold in that currency (framed
 * posters to Canada ship from the UK and cost more than they would sell for).
 */
const POSTER_PRICES: Record<string, { print: Prices; frame?: Prices; wood?: Prices }> = {
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
  digital: { print: { eur: 19, gbp: 16, usd: 19, aud: 30, cad: 29 } },
  /**
   * Square star posters (Prodigi's square prints, v4): each takes the price of
   * the 3:4 size nearest in area (30×30 the 30×40's, 50×50 the 45×60's, 40×40
   * in between), so posters still start at 39 €. Not checked against a square
   * quote yet. Sold as variants of the star map product (STAR_POSTER_SIZES).
   */
  "30x30": {
    print: { eur: 39, gbp: 35, usd: 49, aud: 69, cad: 85 },
    frame: { eur: 119, gbp: 99, usd: 139, aud: 169, cad: null },
    wood: { eur: 129, gbp: 109, usd: 149, aud: 179, cad: null },
  },
  "40x40": {
    print: { eur: 49, gbp: 45, usd: 59, aud: 79, cad: 89 },
    frame: { eur: 129, gbp: 109, usd: 149, aud: 189, cad: null },
    wood: { eur: 139, gbp: 119, usd: 159, aud: 199, cad: null },
  },
  "50x50": {
    print: { eur: 59, gbp: 49, usd: 69, aud: 95, cad: 95 },
    frame: { eur: 149, gbp: 135, usd: 169, aud: 229, cad: null },
    wood: { eur: 159, gbp: 145, usd: 179, aud: 239, cad: null },
  },
}

/**
 * Le Duo (two places or skies on one portrait sheet, v4): the same print and
 * frame as a single poster, so the same Prodigi cost, at +10 (EUR, GBP, USD)
 * or about +15 (AUD, CAD) over the single poster. Sold as the variants of the
 * Duo product (duoPosterProductInput).
 */
export const DUO_PRICES: Record<string, { print: Prices; frame?: Prices; wood?: Prices }> = {
  "30x40": {
    print: { eur: 49, gbp: 45, usd: 59, aud: 85, cad: 99 },
    frame: { eur: 129, gbp: 109, usd: 149, aud: 185, cad: null },
    wood: { eur: 139, gbp: 119, usd: 159, aud: 195, cad: null },
  },
  "45x60": {
    print: { eur: 69, gbp: 59, usd: 79, aud: 109, cad: 109 },
    frame: { eur: 159, gbp: 145, usd: 179, aud: 245, cad: null },
    wood: { eur: 169, gbp: 155, usd: 189, aud: 255, cad: null },
  },
  "60x80": {
    print: { eur: 89, gbp: 79, usd: 89, aud: 145, cad: 135 },
    frame: { eur: 189, gbp: 179, usd: 219, aud: 325, cad: null },
    wood: { eur: 199, gbp: 189, usd: 229, aud: 335, cad: null },
  },
}

/** « Ajouter une photo » (v4 proposal): added to the poster's price, any size or frame. Included in Le Trio. */
export const PHOTO_OPTION_PRICES: Prices = { eur: 10, gbp: 9, usd: 10, aud: 15, cad: 15 }

/**
 * L'Ensemble (two posters) and Le Trio (three) take this off the posters'
 * total, frames included; the storefront shows it as « −20 % », never as an
 * amount. Delivery is free on every order, since these prices already cover
 * it (the seed's 10 € shipping options still need setting to 0).
 */
export const SET_DISCOUNT = 0.2

/**
 * A set's prices: `count` posters of one size in one finish (the 3:4 prices above), less SET_DISCOUNT,
 * to the cent. Not sold where one of the posters isn't.
 */
function setPrices(count: number): Record<string, { print: Prices; frame?: Prices; wood?: Prices }> {
  const set = (prices?: Prices): Prices | undefined =>
    prices &&
    Object.fromEntries(
      Object.entries(prices).map(([code, amount]) => [
        code,
        typeof amount === "number" ? Math.round(amount * count * (1 - SET_DISCOUNT) * 100) / 100 : null,
      ])
    )
  return Object.fromEntries(
    POSTER_SIZES.filter((size) => !size.digital).map((size) => {
      const { print, frame, wood } = POSTER_PRICES[size.id]!
      return [size.id, { print: set(print)!, frame: set(frame), wood: set(wood) }]
    })
  )
}

/**
 * L'Ensemble: the sky's poster and the map's, one size and one finish for both, at the two posters'
 * price less SET_DISCOUNT, frames included (238.40 € for two 45 × 60 cm posters in black frames). Sold as
 * the variants of the L'Ensemble product (ensemblePosterProductInput); its line prints two files.
 */
export const ENSEMBLE_PRICES = setPrices(2)

/**
 * Le Trio: the sky's poster, the photo's and the map's, one size and one finish for all three, at the
 * three posters' price less SET_DISCOUNT, frames and the photo included (357.60 € for three 45 × 60 cm
 * posters in black frames). Sold as the variants of the Trio product (trioPosterProductInput); its line
 * prints three files.
 */
export const TRIO_PRICES = setPrices(3)

/** Carte cadeau (designed, not a product yet): a fixed amount, or any amount in the range. EUR only for now. */
export const GIFT_CARD_EUR = { amounts: [39, 59, 119, 189], min: 39, max: 400 }

/** A poster variant's prices in the given store currencies (none where it isn't sold). */
export function posterVariantPrices(
  sizeId: string,
  frameId: string,
  currencies: string[],
  prices: Record<string, { print: Prices; frame?: Prices; wood?: Prices }> = POSTER_PRICES
) {
  const size = prices[sizeId]
  const table = frameId === "none" ? size?.print : frameId === "oak" ? size?.wood : size?.frame
  return currencies.flatMap((code) => {
    const amount = table?.[code]
    return typeof amount === "number" ? [{ currency_code: code, amount }] : []
  })
}

type ProductContext = {
  /** Store currencies to price in; currencies missing from the price table are skipped. */
  currencies: string[]
  salesChannelId: string
  /** Shipping profile of the printed posters (the digital file has none). */
  shippingProfileId: string
}

/** The two poster products, as `createProductsWorkflow` input. */
export function posterProductsInput(ctx: ProductContext): CreateProductWorkflowInputDTO[] {
  const printSizes = POSTER_SIZES.filter((size) => !size.digital)
  const digital = POSTER_SIZES.find((size) => size.digital)!
  const metadata = (size: PosterSize, frame: string): PosterVariantMetadata => ({
    poster_size: size.id,
    poster_frame: frame,
    width_mm: size.widthMm,
    height_mm: size.heightMm,
    ...(size.digital ? { digital: true } : {}),
  })
  const common = {
    status: ProductStatus.PUBLISHED,
    metadata: { builder: MAP_POSTER_BUILDER },
    sales_channels: [{ id: ctx.salesChannelId }],
  }

  return [
    {
      ...common,
      title: "Custom map poster",
      handle: MAP_POSTER_HANDLE,
      description:
        "A map poster of the place that matters to you. Design it in the poster builder: frame the map, pick a style, a layout and your text, then choose a size and a frame.",
      shipping_profile_id: ctx.shippingProfileId,
      options: [
        { title: "Poster size", values: printSizes.map((size) => size.title) },
        { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
      ],
      variants: printSizes.flatMap((size) =>
        POSTER_FRAMES.map((frame) => ({
          title: `${size.title} / ${frame.title}`,
          sku: `MAP-POSTER-${size.id}-${frame.id}`.toUpperCase(),
          manage_inventory: false,
          options: { "Poster size": size.title, Frame: frame.title },
          metadata: metadata(size, frame.id),
          prices: posterVariantPrices(size.id, frame.id, ctx.currencies),
        }))
      ),
    },
    {
      ...common,
      title: "Custom map poster – digital file",
      handle: MAP_POSTER_DIGITAL_HANDLE,
      description:
        "Your custom map poster as a high-resolution file, ready to print at up to 30 × 40 cm.",
      options: [{ title: "Format", values: [digital.title] }],
      variants: [
        {
          title: digital.title,
          sku: "MAP-POSTER-DIGITAL",
          manage_inventory: false,
          options: { Format: digital.title },
          metadata: metadata(digital, "none"),
          prices: posterVariantPrices(digital.id, "none", ctx.currencies),
        },
      ],
    },
  ]
}

/**
 * The star map product, as `createProductsWorkflow` input: one variant per size × frame, the same frames
 * and prices as the map poster for the 3:4 sizes, the square prices above for the squares. The design
 * travels in the line item's metadata (`metadata.poster`, `design.kind: "star"`).
 */
export function starPosterProductInput(ctx: ProductContext): CreateProductWorkflowInputDTO {
  return {
    status: ProductStatus.PUBLISHED,
    metadata: { builder: STAR_POSTER_BUILDER },
    sales_channels: [{ id: ctx.salesChannelId }],
    title: "Custom star map",
    handle: STAR_POSTER_HANDLE,
    description:
      "The sky above a place at a moment that matters to you. Design it in the Atelier: the place, the date and the time, a layout, a style and a colour, your text, then a size and a frame.",
    shipping_profile_id: ctx.shippingProfileId,
    options: [
      { title: "Poster size", values: STAR_POSTER_SIZES.map((size) => size.title) },
      { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
    ],
    variants: STAR_POSTER_SIZES.flatMap((size) =>
      POSTER_FRAMES.map((frame) => ({
        title: `${size.title} / ${frame.title}`,
        sku: `STAR-POSTER-${size.id}-${frame.id}`.toUpperCase(),
        manage_inventory: false,
        options: { "Poster size": size.title, Frame: frame.title },
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

/**
 * The L'Ensemble product, as `createProductsWorkflow` input: one variant per size × frame, the three 3:4
 * prints (both posters portrait) at ENSEMBLE_PRICES. A variant is the pair: two prints, and two frames
 * when framed. The design travels in the line item's metadata (`metadata.poster`, `design.kind:
 * "ensemble"`); the print workflow renders each poster of it (src/poster/print-files.ts).
 */
export function ensemblePosterProductInput(ctx: ProductContext): CreateProductWorkflowInputDTO {
  const sizes = POSTER_SIZES.filter((size) => !size.digital)
  return {
    status: ProductStatus.PUBLISHED,
    metadata: { builder: ENSEMBLE_POSTER_BUILDER },
    sales_channels: [{ id: ctx.salesChannelId }],
    title: "L'Ensemble",
    handle: ENSEMBLE_POSTER_HANDLE,
    description:
      "The star map and the city map of one place and moment: two posters designed as one, meeting at the centre when they hang side by side. Design them in the Atelier: the place and the moment, a layout, a style and a colour, your text, then a size and a frame for both.",
    shipping_profile_id: ctx.shippingProfileId,
    options: [
      { title: "Poster size", values: sizes.map((size) => size.title) },
      { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
    ],
    variants: sizes.flatMap((size) =>
      POSTER_FRAMES.map((frame) => ({
        title: `2 × ${size.title} / ${frame.title}`,
        sku: `ENSEMBLE-POSTER-${size.id}-${frame.id}`.toUpperCase(),
        manage_inventory: false,
        options: { "Poster size": size.title, Frame: frame.title },
        metadata: {
          poster_size: size.id,
          poster_frame: frame.id,
          width_mm: size.widthMm,
          height_mm: size.heightMm,
        } satisfies PosterVariantMetadata,
        prices: posterVariantPrices(size.id, frame.id, ctx.currencies, ENSEMBLE_PRICES),
      }))
    ),
  }
}

/**
 * The Trio product, as `createProductsWorkflow` input: one variant per size × frame, the three 3:4 prints
 * (all three posters portrait) at TRIO_PRICES. A variant is the three posters, and three frames when
 * framed. The design travels in the line item's metadata (`metadata.poster`, `design.kind: "trio"`, the
 * photo's URL in `design.photo`); the print workflow renders each poster of it (src/poster/print-files.ts).
 */
export function trioPosterProductInput(ctx: ProductContext): CreateProductWorkflowInputDTO {
  const sizes = POSTER_SIZES.filter((size) => !size.digital)
  return {
    status: ProductStatus.PUBLISHED,
    metadata: { builder: TRIO_POSTER_BUILDER },
    sales_channels: [{ id: ctx.salesChannelId }],
    title: "Le Trio",
    handle: TRIO_POSTER_HANDLE,
    description:
      "The star map, your photo and the city map of one place and moment: three posters designed as one, hung side by side. Design them in the Atelier: the place, the moment and the photo, a layout, a style and a colour, your text, then a size and a frame for all three.",
    shipping_profile_id: ctx.shippingProfileId,
    options: [
      { title: "Poster size", values: sizes.map((size) => size.title) },
      { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
    ],
    variants: sizes.flatMap((size) =>
      POSTER_FRAMES.map((frame) => ({
        title: `3 × ${size.title} / ${frame.title}`,
        sku: `TRIO-POSTER-${size.id}-${frame.id}`.toUpperCase(),
        manage_inventory: false,
        options: { "Poster size": size.title, Frame: frame.title },
        metadata: {
          poster_size: size.id,
          poster_frame: frame.id,
          width_mm: size.widthMm,
          height_mm: size.heightMm,
        } satisfies PosterVariantMetadata,
        prices: posterVariantPrices(size.id, frame.id, ctx.currencies, TRIO_PRICES),
      }))
    ),
  }
}

/**
 * The Duo product, as `createProductsWorkflow` input: one variant per size × frame, the three 3:4 prints
 * (the Duo is portrait only) at the Duo's prices. The design travels in the line item's metadata
 * (`metadata.poster`, `design.kind: "duo"`).
 */
export function duoPosterProductInput(ctx: ProductContext): CreateProductWorkflowInputDTO {
  const sizes = POSTER_SIZES.filter((size) => !size.digital)
  return {
    status: ProductStatus.PUBLISHED,
    metadata: { builder: DUO_POSTER_BUILDER },
    sales_channels: [{ id: ctx.salesChannelId }],
    title: "Le Duo",
    handle: DUO_POSTER_HANDLE,
    description:
      "Two places, two skies, or a place and its sky, on one poster. Design it in the Atelier: the two, a layout, a style and a colour, your text, then a size and a frame.",
    shipping_profile_id: ctx.shippingProfileId,
    options: [
      { title: "Poster size", values: sizes.map((size) => size.title) },
      { title: "Frame", values: POSTER_FRAMES.map((frame) => frame.title) },
    ],
    variants: sizes.flatMap((size) =>
      POSTER_FRAMES.map((frame) => ({
        title: `${size.title} / ${frame.title}`,
        sku: `DUO-POSTER-${size.id}-${frame.id}`.toUpperCase(),
        manage_inventory: false,
        options: { "Poster size": size.title, Frame: frame.title },
        metadata: {
          poster_size: size.id,
          poster_frame: frame.id,
          width_mm: size.widthMm,
          height_mm: size.heightMm,
        } satisfies PosterVariantMetadata,
        prices: posterVariantPrices(size.id, frame.id, ctx.currencies, DUO_PRICES),
      }))
    ),
  }
}
