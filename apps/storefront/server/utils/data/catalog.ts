import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { useMedusa } from "../medusa"
import { getRegion } from "./regions"
import { toCard, type CatalogProduct, type PosterCard } from "#shared/utils/catalog"

/**
 * ShaderPaper's catalogue reads (new; not in Méridien). The shop, collection,
 * home and campaign pages filter and sort the whole poster list on the page
 * (54 posters), so the server returns it once per region as compact cards
 * (shared/utils/catalog.ts) instead of full products with 12 priced variants
 * each. Cards are the same for every visitor of a region, so they sit in a
 * short process-wide cache rather than the per-visitor one.
 */

const CARD_FIELDS =
  "id,handle,title,thumbnail,created_at,metadata,collection.id,collection.handle,collection.title,tags.value,variants.id,*variants.calculated_price"

const PRODUCT_FIELDS =
  "*variants.calculated_price,*variants.options,*variants.options.option,*options,*options.values,*collection,*images,*tags,+metadata"

const TTL_MS = 60_000
const cardCache = new Map<string, { at: number; cards: PosterCard[] }>()

export async function listCatalog(event: H3Event, countryCode: string): Promise<PosterCard[]> {
  const region = await getRegion(event, countryCode)
  if (!region) return []

  const hit = cardCache.get(region.id)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.cards

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }
  const products: HttpTypes.StoreProduct[] = []
  const limit = 100
  for (let offset = 0; offset < 1000; offset += limit) {
    const page = await sdk.client.fetch<{ products: HttpTypes.StoreProduct[]; count: number }>("/store/products", {
      query: { limit, offset, region_id: region.id, fields: CARD_FIELDS },
      headers,
    })
    products.push(...page.products)
    if (products.length >= page.count || page.products.length < limit) break
  }

  const cards = products.map((p, i) => toCard(p as unknown as CatalogProduct, i))
  cardCache.set(region.id, { at: Date.now(), cards })
  return cards
}

/** One poster product with everything the product page needs, or null. */
export async function getPosterProduct(
  event: H3Event,
  handle: string,
  countryCode: string
): Promise<HttpTypes.StoreProduct | null> {
  const region = await getRegion(event, countryCode)
  if (!region) return null
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }
  const { products } = await sdk.client.fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
    query: { handle, region_id: region.id, fields: PRODUCT_FIELDS, limit: 1 },
    headers,
  })
  return products[0] ?? null
}

/** Store product search (Medusa's `q` parameter), as cards. */
export async function searchCatalog(event: H3Event, q: string, countryCode: string): Promise<PosterCard[]> {
  const region = await getRegion(event, countryCode)
  if (!region || !q.trim()) return []
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }
  const { products } = await sdk.client.fetch<{ products: HttpTypes.StoreProduct[] }>("/store/products", {
    query: { q: q.trim().slice(0, 100), limit: 60, region_id: region.id, fields: CARD_FIELDS },
    headers,
  })
  return products.map((p, i) => toCard(p as unknown as CatalogProduct, i))
}
