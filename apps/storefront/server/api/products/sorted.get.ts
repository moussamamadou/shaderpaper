import { createError, defineEventHandler, getQuery } from "h3"
import type {
  ProductListQueryParams,
  SortOptions,
} from "../../utils/data/products"
import { listProductsWithSort } from "../../utils/data/products"

/**
 * listProductsWithSort — sorted + paginated over a single 100-product fetch
 * (store API can't sort by price).
 * Query: page (default 1), sortBy (created_at|price_asc|price_desc),
 * country_code (required), optionValueIds (repeatable or comma-separated),
 * limit, extra params pass through.
 * NOTE (Next parity): nextPage here is an OFFSET, unlike /api/products.
 */
export default defineEventHandler(async (event) => {
  const { page, sortBy, country_code, optionValueIds, ...rest } =
    getQuery(event)

  if (!country_code) {
    throw createError({ statusCode: 400, message: "country_code is required" })
  }

  // Accept repeated params or a comma-separated value, deduped
  // (parseOptionValueIds parity).
  let parsedOptionValueIds: string[] = []
  if (Array.isArray(optionValueIds)) {
    parsedOptionValueIds = Array.from(
      new Set((optionValueIds as string[]).filter(Boolean))
    )
  } else if (typeof optionValueIds === "string" && optionValueIds.length > 0) {
    parsedOptionValueIds = optionValueIds.split(",").filter(Boolean)
  }

  const queryParams = { ...rest } as ProductListQueryParams

  if (rest.limit !== undefined) {
    queryParams.limit = Number(rest.limit)
  }

  return listProductsWithSort(event, {
    page: page ? Number(page) : 1,
    queryParams,
    sortBy: (sortBy as SortOptions) || "created_at",
    countryCode: country_code as string,
    optionValueIds: parsedOptionValueIds,
  })
})
