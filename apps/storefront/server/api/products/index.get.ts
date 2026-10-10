import { defineEventHandler, getQuery } from "h3"
import type { ProductListQueryParams } from "../../utils/data/products"
import { listProducts } from "../../utils/data/products"

/**
 * listProducts — paginated product list.
 * Query: page (page number, default 1), country_code OR region_id (one
 * required), limit, and any other Medusa store product params pass through
 * (handle, collection_id[], category_id[], option_value_id[], fields, ...).
 * Returns { response: { products, count }, nextPage (PAGE NUMBER | null),
 * queryParams }.
 */
export default defineEventHandler(async (event) => {
  const { page, country_code, region_id, ...rest } = getQuery(event)

  const queryParams = { ...rest } as ProductListQueryParams

  if (rest.limit !== undefined) {
    queryParams.limit = Number(rest.limit)
  }
  if (rest.offset !== undefined) {
    queryParams.offset = Number(rest.offset)
  }

  return listProducts(event, {
    pageParam: page ? Number(page) : 1,
    queryParams,
    countryCode: country_code as string | undefined,
    regionId: region_id as string | undefined,
  })
})
