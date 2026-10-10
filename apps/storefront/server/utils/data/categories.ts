import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { withCache } from "../cache"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/categories.ts */

export async function listCategories(
  event: H3Event,
  query?: Record<string, unknown>
): Promise<HttpTypes.StoreProductCategory[]> {
  const sdk = useMedusa()

  const limit = query?.limit || 100

  const fullQuery = {
    fields:
      "*category_children, *products, *parent_category, *parent_category.parent_category",
    limit,
    ...query,
  }

  return withCache(
    event,
    "categories",
    `/store/product-categories?${JSON.stringify(fullQuery)}`,
    () =>
      sdk.client.fetch<{
        product_categories: HttpTypes.StoreProductCategory[]
      }>("/store/product-categories", {
        query: fullQuery,
      })
  ).then(({ product_categories }) => product_categories)
}

export async function getCategoryByHandle(
  event: H3Event,
  categoryHandle: string[]
): Promise<HttpTypes.StoreProductCategory | undefined> {
  const handle = `${categoryHandle.join("/")}`

  const sdk = useMedusa()

  return withCache(
    event,
    "categories",
    `/store/product-categories?handle=${handle}`,
    () =>
      sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
        `/store/product-categories`,
        {
          query: {
            fields: "*category_children, *products",
            handle,
          },
        }
      )
  ).then(({ product_categories }) => product_categories[0])
}
