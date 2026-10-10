import type { HttpTypes } from "@medusajs/types"
import type { H3Event } from "h3"
import { getAuthHeaders } from "../auth-headers"
import { withCache } from "../cache"
import { medusaError } from "../medusa-error"
import { useMedusa } from "../medusa"

/** Port of storefront-nextjs src/lib/data/orders.ts */

export async function retrieveOrder(
  event: H3Event,
  id: string
): Promise<HttpTypes.StoreOrder> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  return withCache(event, "orders", `/store/orders/${id}`, () =>
    sdk.client.fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "+customer_id,*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product",
      },
      headers,
    })
  )
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export async function listOrders(
  event: H3Event,
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
): Promise<HttpTypes.StoreOrder[]> {
  const sdk = useMedusa()
  const headers = { ...getAuthHeaders(event) }

  const query = {
    limit,
    offset,
    order: "-created_at",
    fields: "*items,+items.metadata,*items.variant,*items.product,*payment_collections.payments",
    ...filters,
  }

  return withCache(
    event,
    "orders",
    `/store/orders?${JSON.stringify(query)}`,
    () =>
      sdk.client.fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
        method: "GET",
        query,
        headers,
      })
  )
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export type TransferResult = {
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}

export async function createTransferRequest(
  event: H3Event,
  orderId: string | undefined
): Promise<TransferResult> {
  if (!orderId) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const sdk = useMedusa()
  const headers = getAuthHeaders(event)

  return sdk.store.order
    .requestTransfer(orderId, {}, { fields: "id, email" }, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export async function acceptTransferRequest(
  event: H3Event,
  id: string,
  token: string
): Promise<TransferResult> {
  const sdk = useMedusa()
  const headers = getAuthHeaders(event)

  return sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export async function declineTransferRequest(
  event: H3Event,
  id: string,
  token: string
): Promise<TransferResult> {
  const sdk = useMedusa()
  const headers = getAuthHeaders(event)

  return sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
