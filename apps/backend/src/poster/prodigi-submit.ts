/**
 * Sends a placed order's posters to Prodigi, when an admin asks (POST /admin/orders/:id/prodigi).
 * SERVER ONLY. Never called automatically: not on order.placed, not on a schedule.
 *
 * Refuses (ProdigiError `precondition`, HTTP 409) while Prodigi is off, a SKU it needs is null, a
 * poster has no rendered print file, the print file URL is local, the shipping address is incomplete,
 * or the order was already sent. Records the outcome in the order's metadata:
 * `metadata.prodigi = { env, order_id, outcome, stage, shipping_method, submitted_at, items }`, or
 * `metadata.prodigi_error = { message, kind, outcome, at }` when Prodigi refused it.
 */
import {
  buildProdigiOrder,
  missingProdigiSkus,
  prodigiShippingMethod,
  ProdigiError,
  type MedusaAddress,
  type ProdigiClient,
  type ProdigiLine,
  type ProdigiShippingMethod,
} from "./prodigi"
import { lineSizeAndFrame, posterMetadata, SHADER_DESIGN_KIND } from "./print-files"

/** What is recorded in `order.metadata.prodigi` once Prodigi has the order. */
export type ProdigiSubmission = {
  env: string
  order_id: string
  outcome: string
  stage: string | null
  shipping_method: ProdigiShippingMethod
  submitted_at: string
  items: { item_id: string; sku: string; copies: number }[]
}

type OrderRecord = {
  id: string
  display_id?: number | string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
  shipping_address?: MedusaAddress | null
  shipping_methods?: ({ name?: string | null } | null)[] | null
  items?: ({
    id: string
    quantity?: number | string | null
    metadata?: Record<string, unknown> | null
    variant_sku?: string | null
    variant?: { metadata?: Record<string, unknown> | null } | null
  } | null)[] | null
}

export type ProdigiSubmitDeps = {
  /** Medusa's Query (`container.resolve(ContainerRegistrationKeys.QUERY)`). */
  query: { graph: (config: any) => Promise<{ data: any[] }> }
  /** The File Module: a download URL for each print file. */
  files: { retrieveFile: (id: string) => Promise<{ url: string }> }
  /** The Order Module: records the outcome in the order's metadata. */
  orders: { updateOrders: (id: string, data: { metadata: Record<string, unknown> }) => Promise<unknown> }
  /** A Prodigi client; throws a `precondition` ProdigiError when Prodigi is off (see prodigiClient). */
  client: () => ProdigiClient
  now?: () => Date
}

export const PRODIGI_ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "metadata",
  "shipping_address.*",
  "shipping_methods.name",
  "items.id",
  "items.quantity",
  "items.metadata",
  "items.variant_sku",
  "items.variant.metadata",
]

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"])

/** Whether Prodigi could download a URL: http(s) and not this machine. */
export function isFetchableUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return (protocol === "https:" || protocol === "http:") && !LOCAL_HOSTS.has(hostname) && !hostname.endsWith(".localhost")
  } catch {
    return false
  }
}

export async function submitOrderToProdigi(
  deps: ProdigiSubmitDeps,
  orderId: string,
  options: { shippingMethod?: ProdigiShippingMethod } = {}
): Promise<ProdigiSubmission> {
  // First, so nothing is read while Prodigi is off.
  const client = deps.client()
  const now = deps.now ?? (() => new Date())

  const {
    data: [order],
  } = (await deps.query.graph({ entity: "order", fields: PRODIGI_ORDER_FIELDS, filters: { id: orderId } })) as {
    data: OrderRecord[]
  }
  if (!order) throw new ProdigiError("not_found", `Order ${orderId} was not found`)

  const previous = order.metadata?.prodigi as { order_id?: string } | undefined
  if (previous?.order_id) {
    throw new ProdigiError(
      "precondition",
      `Order ${orderId} was already sent to Prodigi (${previous.order_id}); change or cancel it in Prodigi's dashboard`,
      { details: { prodigi: previous } }
    )
  }

  const posters = (order.items ?? []).flatMap((item) => {
    const poster = item && posterMetadata(item.metadata)
    return item && poster?.design?.kind === SHADER_DESIGN_KIND ? [{ item, poster }] : []
  })
  if (!posters.length) throw new ProdigiError("precondition", `Order ${orderId} has no shader poster to print`)

  const unknown = posters.filter(({ item }) => {
    const { sizeId, frameId } = lineSizeAndFrame(item)
    return !sizeId || !frameId
  })
  if (unknown.length) {
    throw new ProdigiError(
      "precondition",
      `Unknown size or frame for line(s) ${unknown.map(({ item }) => item.id).join(", ")}`
    )
  }

  // SKUs before print files: a missing SKU is a business decision, not a render to retry.
  const pairs = posters.map(({ item }) => lineSizeAndFrame(item) as { sizeId: string; frameId: string })
  const skusMissing = missingProdigiSkus(pairs)
  if (skusMissing.length) {
    throw new ProdigiError(
      "precondition",
      `No Prodigi SKU chosen for ${skusMissing.join(", ")} (PRODIGI_SKUS in src/poster/catalog.ts, business input)`,
      { details: { skusMissing } }
    )
  }

  const unrendered = posters.filter(({ poster }) => !poster.print_file)
  if (unrendered.length) {
    throw new ProdigiError(
      "precondition",
      `No print file yet for line(s) ${unrendered.map(({ item }) => item.id).join(", ")}: render them first`,
      { details: { printFilesMissing: unrendered.map(({ item }) => item.id) } }
    )
  }

  const lines: ProdigiLine[] = []
  for (const { item, poster } of posters) {
    const fileId = poster.print_file!.file_id
    const url = await deps.files
      .retrieveFile(fileId)
      .then((file) => file.url)
      .catch(() => null)
    if (!url) throw new ProdigiError("precondition", `The print file ${fileId} of line ${item.id} can't be found`)
    if (!isFetchableUrl(url)) {
      throw new ProdigiError(
        "precondition",
        `The print file URL of line ${item.id} (${new URL(url).origin}) is local: Prodigi can't download it. Use a public file provider (e.g. S3) first.`
      )
    }
    const { sizeId, frameId } = lineSizeAndFrame(item) as { sizeId: string; frameId: string }
    lines.push({ item_id: item.id, quantity: Math.max(1, Number(item.quantity) || 1), sizeId, frameId, assetUrl: url })
  }

  const shippingMethod = options.shippingMethod ?? prodigiShippingMethod(order.shipping_methods?.[0]?.name)
  const body = buildProdigiOrder({
    orderId: order.id,
    displayId: Number(order.display_id) || 0,
    email: order.email,
    shippingAddress: order.shipping_address,
    shippingMethod,
    lines,
  })

  const metadata = { ...(order.metadata ?? {}) }
  try {
    const response = await client.createOrder(body)
    const submission: ProdigiSubmission = {
      env: client.config.env,
      order_id: response.order.id,
      outcome: response.outcome,
      stage: response.order.status?.stage ?? null,
      shipping_method: shippingMethod,
      submitted_at: now().toISOString(),
      items: body.items.map((item) => ({ item_id: item.merchantReference!, sku: item.sku, copies: item.copies })),
    }
    const { prodigi_error: _previousError, ...rest } = metadata
    await deps.orders.updateOrders(order.id, { metadata: { ...rest, prodigi_error: null, prodigi: submission } })
    return submission
  } catch (error) {
    if (error instanceof ProdigiError && error.kind !== "precondition") {
      await deps.orders
        .updateOrders(order.id, {
          metadata: {
            ...metadata,
            prodigi_error: { message: error.message, kind: error.kind, outcome: error.outcome ?? null, at: now().toISOString() },
          },
        })
        .catch(() => undefined)
    }
    throw error
  }
}
