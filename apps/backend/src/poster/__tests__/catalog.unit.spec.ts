import { isValidHandle } from "@medusajs/framework/utils"

import {
  POSTER_COLLECTIONS,
  POSTER_FRAMES,
  POSTER_SIZES,
  PRODIGI_SKUS,
  SHADER_POSTERS,
  frameFromSku,
  posterHandle,
  posterSku,
  posterVariantPrices,
  shaderPosterProductInput,
  shaderPosterProductsInput,
  sizeFromSku,
} from "../catalog"

const ctx = {
  currencies: ["eur", "usd"],
  salesChannelId: "sc_1",
  shippingProfileId: "sp_1",
  collectionIds: Object.fromEntries(POSTER_COLLECTIONS.map((c) => [c.category, `pcol_${c.handle}`])),
}

describe("poster list (posters.json)", () => {
  it("has the gallery's 54 posters, each with four knobs, a category and a pick", () => {
    expect(SHADER_POSTERS).toHaveLength(54)
    expect(new Set(SHADER_POSTERS.map((p) => p.id)).size).toBe(54)
    for (const poster of SHADER_POSTERS) {
      expect(poster.knobs).toHaveLength(4)
      expect(POSTER_COLLECTIONS.map((c) => c.category)).toContain(poster.category)
      expect(["n", "b", "v"]).toContain(poster.strength)
      expect(poster.name).toBeTruthy()
      expect(poster.blurb).toBeTruthy()
      for (const knob of poster.knobs) {
        expect(knob.d).toBeGreaterThanOrEqual(0)
        expect(knob.d).toBeLessThanOrEqual(1)
        if ("opts" in knob) expect(knob.opts).toHaveLength(knob.steps)
        else expect(typeof knob.lo).toBe("string")
      }
    }
  })

  it("covers all six collections", () => {
    const used = new Set(SHADER_POSTERS.map((p) => p.category))
    expect([...used].sort()).toEqual(POSTER_COLLECTIONS.map((c) => c.category).sort())
  })

  it("gives every poster a handle Medusa accepts", () => {
    for (const poster of SHADER_POSTERS) expect(isValidHandle(posterHandle(poster.id))).toBe(true)
    expect(posterHandle("k_cpack")).toBe("k-cpack")
    expect(new Set(SHADER_POSTERS.map((p) => posterHandle(p.id))).size).toBe(54)
  })
})

describe("catalogue", () => {
  it("keeps Méridien's three 3:4 sizes and four frames", () => {
    expect(POSTER_SIZES.map((s) => s.id)).toEqual(["30x40", "45x60", "60x80"])
    for (const size of POSTER_SIZES) {
      expect(size.widthMm * 4).toBe(size.heightMm * 3)
      expect(size.printPx[0] * 4).toBe(size.printPx[1] * 3)
    }
    expect(POSTER_FRAMES.map((f) => f.id)).toEqual(["none", "black", "white", "oak"])
  })

  it("prices variants from Méridien's table in the store currencies", () => {
    expect(posterVariantPrices("30x40", "none", ["eur", "usd"])).toEqual([
      { currency_code: "eur", amount: 39 },
      { currency_code: "usd", amount: 49 },
    ])
    expect(posterVariantPrices("45x60", "black", ["eur"])).toEqual([{ currency_code: "eur", amount: 149 }])
    expect(posterVariantPrices("45x60", "white", ["eur"])).toEqual([{ currency_code: "eur", amount: 149 }])
    expect(posterVariantPrices("60x80", "oak", ["eur", "usd"])).toEqual([
      { currency_code: "eur", amount: 189 },
      { currency_code: "usd", amount: 219 },
    ])
    // Not sold in CAD when framed (Méridien's table), unknown currency skipped.
    expect(posterVariantPrices("30x40", "black", ["cad", "xyz"])).toEqual([])
  })

  it("builds SKUs and reads them back", () => {
    expect(posterSku("glass", "30x40", "none")).toBe("SP-GLASS-30X40-NONE")
    expect(posterSku("k_cpack", "45x60", "oak")).toBe("SP-K_CPACK-45X60-OAK")
    expect(sizeFromSku("SP-K_CPACK-45X60-OAK")).toBe("45x60")
    expect(frameFromSku("SP-K_CPACK-45X60-OAK")).toBe("oak")
    expect(sizeFromSku("MAP-POSTER-30X40-NONE")).toBeUndefined()
    expect(sizeFromSku(null)).toBeUndefined()
  })

  it("leaves every Prodigi SKU to the business (null)", () => {
    for (const size of POSTER_SIZES) {
      for (const frame of POSTER_FRAMES) expect(PRODIGI_SKUS[size.id][frame.id]).toBeNull()
    }
  })
})

describe("shaderPosterProductInput", () => {
  const glass = SHADER_POSTERS.find((p) => p.id === "glass")!
  const product = shaderPosterProductInput(glass, ctx)

  it("is one published product per poster, in its collection", () => {
    expect(product).toMatchObject({
      status: "published",
      title: glass.name,
      handle: "glass",
      description: glass.blurb,
      thumbnail: "/posters/glass.webp",
      collection_id: `pcol_${POSTER_COLLECTIONS.find((c) => c.category === glass.category)!.handle}`,
      sales_channels: [{ id: "sc_1" }],
      shipping_profile_id: "sp_1",
      metadata: {
        builder: "shader",
        shader: { id: "glass", strength: glass.strength },
        knobs: glass.knobs,
        category: glass.category,
      },
    })
    expect(product.options).toEqual([
      { title: "Size", values: ["30 × 40 cm", "45 × 60 cm", "60 × 80 cm"] },
      { title: "Frame", values: ["No frame", "Black", "White", "Natural wood"] },
    ])
  })

  it("has 12 made-to-order variants with Méridien's variant metadata", () => {
    expect(product.variants).toHaveLength(12)
    const variant = product.variants!.find((v) => v.sku === "SP-GLASS-45X60-OAK")!
    expect(variant).toMatchObject({
      title: "45 × 60 cm / Natural wood",
      manage_inventory: false,
      options: { Size: "45 × 60 cm", Frame: "Natural wood" },
      metadata: { poster_size: "45x60", poster_frame: "oak", width_mm: 450, height_mm: 600 },
      prices: [
        { currency_code: "eur", amount: 159 },
        { currency_code: "usd", amount: 179 },
      ],
    })
    for (const v of product.variants!) expect(v.prices).toHaveLength(2)
  })

  it("covers the whole catalogue", () => {
    const all = shaderPosterProductsInput(ctx)
    expect(all).toHaveLength(54)
    expect(all.flatMap((p) => p.variants ?? [])).toHaveLength(54 * 12)
    const skus = all.flatMap((p) => (p.variants ?? []).map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)
    expect(all.find((p) => p.handle === "k-cpack")?.metadata).toMatchObject({ shader: { id: "k_cpack" } })
  })
})
