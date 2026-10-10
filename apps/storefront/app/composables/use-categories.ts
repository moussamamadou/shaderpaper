import type { HttpTypes } from "@medusajs/types"

export function useCategories() {
  const requestFetch = useRequestFetch()

  /**
   * GET /api/categories — StoreProductCategory[] (default fields incl.
   * children/products/parents, limit 100; query merges over).
   */
  const listCategories = (
    query: Record<string, string> = {}
  ): Promise<HttpTypes.StoreProductCategory[]> =>
    requestFetch<HttpTypes.StoreProductCategory[]>("/api/categories", { query })

  /**
   * GET /api/categories/:handle+ — catch-all; segments joined with '/'.
   * null when missing.
   */
  const getCategoryByHandle = async (
    categoryHandle: string[] | string
  ): Promise<HttpTypes.StoreProductCategory | null> => {
    const handle = Array.isArray(categoryHandle)
      ? categoryHandle.join("/")
      : categoryHandle
    const res = await requestFetch<HttpTypes.StoreProductCategory | null>(
      `/api/categories/${handle}`
    )
    return res ?? null
  }

  return { listCategories, getCategoryByHandle }
}
