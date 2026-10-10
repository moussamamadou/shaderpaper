/**
 * Prodigi Print API v4 client. SERVER ONLY: it holds the API key; never import it from admin or
 * storefront code.
 *
 * Off unless PRODIGI_API_KEY is set; sandbox unless PRODIGI_ENV=live, which is refused outside
 * production (NODE_ENV=production): live orders are printed, shipped and charged. Nothing calls it on
 * its own: an admin submits an order with POST /admin/orders/:id/prodigi (src/poster/prodigi-submit.ts).
 *
 * Written from Prodigi's reference (https://www.prodigi.com/print-api/docs/reference/) without access to
 * Prodigi's servers: untested against them. Unit tests mock fetch (src/poster/__tests__).
 */
import {
  POSTER_FRAMES,
  POSTER_SIZES,
  PRODIGI_ITEM_ATTRIBUTES,
  PRODIGI_SKUS,
  type PosterFrameId,
} from "./catalog"

export const PRODIGI_BASE_URLS = {
  sandbox: "https://api.sandbox.prodigi.com/v4.0/",
  live: "https://api.prodigi.com/v4.0/",
} as const

export type ProdigiEnv = keyof typeof PRODIGI_BASE_URLS

const REQUEST_TIMEOUT_MS = 30_000

export type ProdigiConfig = { apiKey: string; env: ProdigiEnv; baseUrl: string }

/** What the environment allows: a config, or why there is none. */
export type ProdigiSettings =
  | { configured: true; env: ProdigiEnv; config: ProdigiConfig }
  | { configured: false; env: string; reason: string }

/** Reads PRODIGI_API_KEY, PRODIGI_ENV (sandbox by default) and NODE_ENV. */
export function prodigiSettings(env: NodeJS.ProcessEnv = process.env): ProdigiSettings {
  const name = (env.PRODIGI_ENV?.trim() || "sandbox").toLowerCase()
  if (name !== "sandbox" && name !== "live") {
    return { configured: false, env: name, reason: `PRODIGI_ENV must be "sandbox" or "live", not "${name}"` }
  }
  const apiKey = env.PRODIGI_API_KEY?.trim()
  if (!apiKey) {
    return { configured: false, env: name, reason: "Prodigi is off: PRODIGI_API_KEY is empty" }
  }
  if (name === "live" && env.NODE_ENV !== "production") {
    return {
      configured: false,
      env: name,
      reason:
        "PRODIGI_ENV=live is refused outside production (NODE_ENV=production): live orders are printed, shipped and charged. Use the sandbox.",
    }
  }
  return { configured: true, env: name, config: { apiKey, env: name, baseUrl: PRODIGI_BASE_URLS[name] } }
}

/**
 * - `precondition`: ours to fix before calling Prodigi (not configured, SKU or print file missing,
 *   no shipping address, already submitted). HTTP 409.
 * - `auth`: Prodigi refused the API key (401/403).
 * - `validation`: Prodigi refused the request (400, or an outcome such as ValidationFailed).
 * - `not_found`: 404 (e.g. an unknown SKU).
 * - `rate_limited`: 429, retry later.
 * - `server`: Prodigi answered 5xx; `network`: no answer (timeout, DNS, connection).
 * - `unexpected`: an answer we can't read.
 */
export type ProdigiErrorKind =
  | "precondition"
  | "auth"
  | "validation"
  | "not_found"
  | "rate_limited"
  | "server"
  | "network"
  | "unexpected"

export class ProdigiError extends Error {
  kind: ProdigiErrorKind
  /** Prodigi's HTTP status, when it answered. */
  status?: number
  /** Prodigi's `outcome`, when it gave one. */
  outcome?: string
  /** Prodigi's failure details (e.g. `failures`), or ours (e.g. the missing SKUs). */
  details?: unknown

  constructor(kind: ProdigiErrorKind, message: string, extra: { status?: number; outcome?: string; details?: unknown } = {}) {
    super(message)
    this.name = "ProdigiError"
    this.kind = kind
    Object.assign(this, extra)
  }
}

/** The HTTP status an admin route answers for a Prodigi error. */
export function prodigiErrorStatus(error: ProdigiError): number {
  switch (error.kind) {
    case "precondition":
      return 409
    case "validation":
      return 422
    case "not_found":
      return 404
    case "rate_limited":
      return 503
    default:
      // auth, server, network, unexpected: the upstream call failed.
      return 502
  }
}

// ---- API types (the parts used here; see Prodigi's reference for the rest) ----

export type ProdigiShippingMethod = "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight"
export const PRODIGI_SHIPPING_METHODS: ProdigiShippingMethod[] = ["Budget", "Standard", "StandardPlus", "Express", "Overnight"]
export type ProdigiSizing = "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea"

export type ProdigiAddress = {
  line1: string
  line2?: string
  postalOrZipCode: string
  countryCode: string
  townOrCity: string
  stateOrCounty?: string
}

export type ProdigiRecipient = { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress }

export type ProdigiOrderItem = {
  merchantReference?: string
  sku: string
  copies: number
  sizing: ProdigiSizing
  attributes?: Record<string, string>
  assets: { printArea: string; url: string }[]
}

export type ProdigiOrderRequest = {
  merchantReference: string
  idempotencyKey: string
  shippingMethod: ProdigiShippingMethod
  recipient: ProdigiRecipient
  items: ProdigiOrderItem[]
  callbackUrl?: string
  metadata?: Record<string, unknown>
}

/** Prodigi's order outcome, normalised to camelCase (`Created` → `created`). */
export type ProdigiOrderOutcome = "created" | "onHold" | "createdWithIssues" | "alreadyExists" | (string & {})

/** Outcomes after which Prodigi has the order. */
export const PRODIGI_ACCEPTED_OUTCOMES = ["created", "onHold", "createdWithIssues", "alreadyExists"]

export type ProdigiOrder = {
  id: string
  status?: { stage?: string; issues?: unknown[]; details?: Record<string, string> }
  [key: string]: unknown
}

export type ProdigiOrderResponse = { outcome: ProdigiOrderOutcome; order: ProdigiOrder; traceParent?: string }

export type ProdigiQuoteRequest = {
  shippingMethod?: ProdigiShippingMethod
  destinationCountryCode: string
  currencyCode?: string
  items: { sku: string; copies: number; attributes?: Record<string, string>; assets: { printArea: string }[] }[]
}

type Money = { amount: string; currency: string }

export type ProdigiQuote = {
  shipmentMethod: string
  costSummary: { items: Money; shipping: Money; [key: string]: unknown }
  shipments: unknown[]
  items: unknown[]
}

export type ProdigiQuoteResponse = { outcome: string; quotes: ProdigiQuote[]; traceParent?: string }

export type ProdigiProductResponse = { outcome: string; product: Record<string, unknown>; traceParent?: string }

/** `Created` → `created`, `CreatedWithIssues` → `createdWithIssues` (Prodigi answers in PascalCase). */
export const normaliseOutcome = (outcome: unknown): string =>
  typeof outcome === "string" && outcome ? outcome.charAt(0).toLowerCase() + outcome.slice(1) : ""

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export class ProdigiClient {
  readonly config: ProdigiConfig
  #fetch: typeof fetch

  constructor(config: ProdigiConfig, fetchImpl: typeof fetch = fetch) {
    this.config = config
    this.#fetch = fetchImpl
  }

  /** Sends a request; throws ProdigiError for anything but a 2xx JSON answer. */
  async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = new URL(path.replace(/^\/+/, ""), this.config.baseUrl).href
    let response: Response
    try {
      response = await this.#fetch(url, {
        method,
        headers: {
          "X-API-Key": this.config.apiKey,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new ProdigiError("network", `Prodigi (${this.config.env}) could not be reached: ${reason}`)
    }

    const text = await response.text().catch(() => "")
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    const outcome = isObject(json) && typeof json.outcome === "string" ? json.outcome : undefined
    const details = isObject(json) ? (json.failures ?? json.errors ?? json) : text.slice(0, 500) || undefined
    const status = response.status
    const where = `Prodigi (${this.config.env}) ${method} ${path}`

    if (status === 401 || status === 403) {
      throw new ProdigiError("auth", `${where}: ${status}, the API key was refused (check PRODIGI_API_KEY and PRODIGI_ENV)`, { status, outcome, details })
    }
    if (status === 404) throw new ProdigiError("not_found", `${where}: 404 not found`, { status, outcome, details })
    if (status === 429) throw new ProdigiError("rate_limited", `${where}: 429 too many requests, retry later`, { status, outcome, details })
    if (status >= 500) throw new ProdigiError("server", `${where}: Prodigi answered ${status}`, { status, outcome, details })
    if (status >= 400) {
      throw new ProdigiError("validation", `${where}: ${status}${outcome ? ` ${outcome}` : ""}${summariseFailures(details)}`, {
        status,
        outcome,
        details,
      })
    }
    if (!isObject(json)) throw new ProdigiError("unexpected", `${where}: ${status} without a JSON body`, { status })
    return json as T
  }

  /** POST /orders. Throws unless Prodigi has the order (see PRODIGI_ACCEPTED_OUTCOMES). */
  async createOrder(order: ProdigiOrderRequest): Promise<ProdigiOrderResponse> {
    const response = await this.request<ProdigiOrderResponse>("POST", "orders", order)
    const outcome = normaliseOutcome(response.outcome)
    if (!PRODIGI_ACCEPTED_OUTCOMES.includes(outcome) || !isObject(response.order) || typeof response.order.id !== "string") {
      throw new ProdigiError("validation", `Prodigi did not create the order (outcome: ${response.outcome ?? "none"})`, {
        outcome: response.outcome,
        details: response,
      })
    }
    return { ...response, outcome }
  }

  /** POST /quotes: prices and shipping for items to a country, without ordering. */
  quote(request: ProdigiQuoteRequest): Promise<ProdigiQuoteResponse> {
    return this.request<ProdigiQuoteResponse>("POST", "quotes", request)
  }

  /** GET /products/{sku}: a product's print areas, attributes and variants. */
  getProduct(sku: string): Promise<ProdigiProductResponse> {
    return this.request<ProdigiProductResponse>("GET", `products/${encodeURIComponent(sku)}`)
  }
}

function summariseFailures(details: unknown): string {
  if (!isObject(details)) return ""
  const fields = Object.keys(details).slice(0, 5)
  return fields.length ? ` (${fields.join(", ")})` : ""
}

/** A client from the environment; throws a `precondition` ProdigiError when Prodigi is off. */
export function prodigiClient(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): ProdigiClient {
  const settings = prodigiSettings(env)
  if (!settings.configured) throw new ProdigiError("precondition", settings.reason)
  return new ProdigiClient(settings.config, fetchImpl)
}

// ---- SKUs ----

/** The Prodigi SKU of a size and frame (null: not chosen yet, see PRODIGI_SKUS). */
export const prodigiSku = (sizeId: string, frameId: string): string | null =>
  PRODIGI_SKUS[sizeId]?.[frameId as PosterFrameId] ?? null

/** `size/frame` pairs without a Prodigi SKU: all of the catalogue's, or those given. */
export function missingProdigiSkus(pairs?: { sizeId: string; frameId: string }[]): string[] {
  const all = pairs ?? POSTER_SIZES.flatMap((size) => POSTER_FRAMES.map((frame) => ({ sizeId: size.id, frameId: frame.id })))
  const missing = all.filter(({ sizeId, frameId }) => !prodigiSku(sizeId, frameId)).map(({ sizeId, frameId }) => `${sizeId}/${frameId}`)
  return [...new Set(missing)]
}

// ---- Order building ----

/** A Medusa shipping address (the fields used). */
export type MedusaAddress = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

/** A recipient from a Medusa shipping address; throws a `precondition` error naming what's missing. */
export function prodigiRecipient(address: MedusaAddress | null | undefined, email?: string | null): ProdigiRecipient {
  if (!address) throw new ProdigiError("precondition", "The order has no shipping address")
  const clean = (value?: string | null) => value?.trim() || undefined
  const name = [clean(address.first_name), clean(address.last_name)].filter(Boolean).join(" ") || clean(address.company)
  const recipient: ProdigiRecipient = {
    name: name ?? "",
    ...(clean(email) ? { email: clean(email) } : {}),
    ...(clean(address.phone) ? { phoneNumber: clean(address.phone) } : {}),
    address: {
      line1: clean(address.address_1) ?? "",
      ...(clean(address.address_2) ? { line2: clean(address.address_2) } : {}),
      postalOrZipCode: clean(address.postal_code) ?? "",
      countryCode: (clean(address.country_code) ?? "").toUpperCase(),
      townOrCity: clean(address.city) ?? "",
      ...(clean(address.province) ? { stateOrCounty: clean(address.province) } : {}),
    },
  }
  const missing = [
    !recipient.name && "name",
    !recipient.address.line1 && "address line 1",
    !recipient.address.postalOrZipCode && "postal code",
    !/^[A-Z]{2}$/.test(recipient.address.countryCode) && "country code",
    !recipient.address.townOrCity && "town or city",
  ].filter(Boolean)
  if (missing.length) {
    throw new ProdigiError("precondition", `The shipping address lacks: ${missing.join(", ")}`, { details: { missing } })
  }
  return recipient
}

/** A Prodigi shipping method from the order's Medusa shipping method name ("Express Shipping" → Express). */
export function prodigiShippingMethod(name?: string | null): ProdigiShippingMethod {
  return /express/i.test(name ?? "") ? "Express" : "Standard"
}

/** A poster line to print: its size, frame, copies and print file URL. */
export type ProdigiLine = { item_id: string; quantity: number; sizeId: string; frameId: string; assetUrl: string }

/** The POST /orders body for a Medusa order's poster lines. Throws a `precondition` error for a null SKU. */
export function buildProdigiOrder(input: {
  orderId: string
  displayId: number
  email?: string | null
  shippingAddress: MedusaAddress | null | undefined
  shippingMethod: ProdigiShippingMethod
  lines: ProdigiLine[]
  callbackUrl?: string
}): ProdigiOrderRequest {
  if (!input.lines.length) throw new ProdigiError("precondition", "The order has no poster to print")
  const missing = missingProdigiSkus(input.lines)
  if (missing.length) {
    throw new ProdigiError(
      "precondition",
      `No Prodigi SKU chosen for ${missing.join(", ")} (PRODIGI_SKUS in src/poster/catalog.ts, business input)`,
      { details: { skusMissing: missing } }
    )
  }
  return {
    merchantReference: `SP-${input.displayId}`,
    idempotencyKey: `medusa-${input.orderId}`,
    shippingMethod: input.shippingMethod,
    recipient: prodigiRecipient(input.shippingAddress, input.email),
    items: input.lines.map((line) => {
      const attributes = PRODIGI_ITEM_ATTRIBUTES[line.frameId as PosterFrameId] ?? {}
      return {
        merchantReference: line.item_id,
        sku: prodigiSku(line.sizeId, line.frameId)!,
        copies: line.quantity,
        // The print file has the poster's exact ratio: fill the print area.
        sizing: "fillPrintArea" as const,
        ...(Object.keys(attributes).length ? { attributes } : {}),
        assets: [{ printArea: "default", url: line.assetUrl }],
      }
    }),
    ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
    metadata: { medusa_order_id: input.orderId, display_id: input.displayId },
  }
}
