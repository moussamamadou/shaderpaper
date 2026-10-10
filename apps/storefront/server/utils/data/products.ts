import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { createError } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"
import { getRegion, retrieveRegion } from "./regions"

/** Port of storefront-nextjs src/lib/data/products.ts (+ sort-products util) */

export type SortOptions = "created_at" | "price_asc" | "price_desc"

export type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

export type ProductListResult = {
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}

const DEFAULT_PRODUCT_FIELDS =
  // Trailing comma is intentional (Next parity — Medusa tolerates it).
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,"

export async function listProducts(
  event: H3Event,
  {
    pageParam = 1,
    queryParams,
    countryCode,
    regionId,
  }: {
    pageParam?: number
    queryParams?: ProductListQueryParams
    countryCode?: string
    regionId?: string
  }
): Promise<ProductListResult> {
  if (!countryCode && !regionId) {
    throw createError({
      statusCode: 400,
      message: "Country code or region ID is required",
    })
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(event, countryCode)
  } else {
    region = await retrieveRegion(event, regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  const query = {
    limit,
    offset,
    region_id: region.id,
    fields: DEFAULT_PRODUCT_FIELDS,
    ...queryParams,
  }

  return withCache(
    event,
    "products",
    `/store/products?${JSON.stringify(query)}`,
    () =>
      sdk.client.fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
        `/store/products`,
        {
          method: "GET",
          query,
          headers,
        }
      )
  ).then(({ products, count }) => {
    const nextPage = count > offset + limit ? pageParam + 1 : null

    return {
      response: { products, count },
      nextPage,
      queryParams,
    }
  })
}

/**
 * Client-side sort workaround (store API can't sort by price): fetches ONE
 * page of 100 products, sorts, then slices. NOTE (Next parity): nextPage here
 * is an OFFSET, while listProducts' nextPage is a PAGE NUMBER.
 */
export async function listProductsWithSort(
  event: H3Event,
  {
    page = 0,
    queryParams,
    sortBy = "created_at",
    countryCode,
    optionValueIds,
  }: {
    page?: number
    queryParams?: ProductListQueryParams
    sortBy?: SortOptions
    countryCode: string
    optionValueIds?: string[]
  }
): Promise<ProductListResult> {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const {
    response: { products },
  } = await listProducts(event, {
    pageParam: 0,
    queryParams: {
      ...queryParams,
      ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
      limit: 100,
    },
    countryCode,
  })

  // Sort a copy: `products` may be a live cache entry, and sorting it in place
  // would reorder it for every other consumer of listProducts.
  const sortedProducts = sortProducts([...products], sortBy)

  const pageParam = (page - 1) * limit

  const filteredCount = products.length

  const nextPage = filteredCount > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}

/**
 * Server copy of app/utils/sort-products.ts (kept in sync — server code must
 * not import from app/).
 *
 * Sorts a copy and keeps the precomputed minimum prices in a local Map: the
 * products handed in are frequently shared (cached listProducts payloads), so
 * neither the ordering nor a scratch `_minPrice` property may leak onto them.
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  const sortedProducts = [...products]

  if (["price_asc", "price_desc"].includes(sortBy)) {
    const minPrices = new Map<HttpTypes.StoreProduct, number>()

    for (const product of sortedProducts) {
      if (product.variants && product.variants.length > 0) {
        minPrices.set(
          product,
          Math.min(
            ...product.variants.map(
              (variant) =>
                (variant as any)?.calculated_price?.calculated_amount || 0
            )
          )
        )
      } else {
        minPrices.set(product, Infinity)
      }
    }

    sortedProducts.sort((a, b) => {
      const diff =
        (minPrices.get(a) ?? Infinity) - (minPrices.get(b) ?? Infinity)
      return sortBy === "price_asc" ? diff : -diff
    })
  }

  if (sortBy === "created_at") {
    sortedProducts.sort((a, b) => {
      return (
        new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      )
    })
  }

  return sortedProducts
}
