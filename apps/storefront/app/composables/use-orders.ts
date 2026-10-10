import type { HttpTypes } from "@medusajs/types"

export type TransferResult = {
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}

export function useOrders() {
  const requestFetch = useRequestFetch()

  /** GET /api/orders — THROWS for guests (401). */
  const listOrders = (
    limit = 10,
    offset = 0,
    filters: Record<string, string> = {}
  ): Promise<HttpTypes.StoreOrder[]> =>
    requestFetch<HttpTypes.StoreOrder[]>("/api/orders", { query: { limit, offset, ...filters } })

  /** GET /api/orders/:id — THROWS on failure. */
  const retrieveOrder = (id: string): Promise<HttpTypes.StoreOrder> =>
    requestFetch<HttpTypes.StoreOrder>(`/api/orders/${id}`)

  /** POST /api/orders/transfer — { success, error, order }, never throws. */
  const createTransferRequest = (orderId: string): Promise<TransferResult> =>
    requestFetch<TransferResult>("/api/orders/transfer", {
      method: "POST",
      body: { order_id: orderId },
    })

  /** POST /api/orders/:id/transfer/accept — never throws. */
  const acceptTransferRequest = (
    id: string,
    token: string
  ): Promise<TransferResult> =>
    requestFetch<TransferResult>(`/api/orders/${id}/transfer/accept`, {
      method: "POST",
      body: { token },
    })

  /** POST /api/orders/:id/transfer/decline — never throws. */
  const declineTransferRequest = (
    id: string,
    token: string
  ): Promise<TransferResult> =>
    requestFetch<TransferResult>(`/api/orders/${id}/transfer/decline`, {
      method: "POST",
      body: { token },
    })

  return {
    listOrders,
    retrieveOrder,
    createTransferRequest,
    acceptTransferRequest,
    declineTransferRequest,
  }
}
