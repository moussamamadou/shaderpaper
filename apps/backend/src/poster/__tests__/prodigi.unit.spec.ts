import { PRODIGI_ITEM_ATTRIBUTES, PRODIGI_SKUS } from "../catalog"
import {
  buildProdigiOrder,
  missingProdigiSkus,
  normaliseOutcome,
  ProdigiClient,
  prodigiClient,
  ProdigiError,
  prodigiErrorStatus,
  prodigiRecipient,
  prodigiSettings,
  prodigiShippingMethod,
  type ProdigiConfig,
} from "../prodigi"
import { isFetchableUrl, submitOrderToProdigi, type ProdigiSubmitDeps } from "../prodigi-submit"

const SANDBOX: ProdigiConfig = { apiKey: "test_key", env: "sandbox", baseUrl: "https://api.sandbox.prodigi.com/v4.0/" }

/** A fetch mock answering `status` with `body` (JSON unless a string). */
const answer = (status: number, body: unknown) =>
  jest.fn(async (_url: string, _init?: RequestInit) =>
    typeof body === "string" ? new Response(body, { status }) : Response.json(body, { status })
  )

const address = {
  first_name: "Ada",
  last_name: "Lovelace",
  address_1: "12 Rue de la Paix",
  address_2: "",
  city: "Paris",
  province: null,
  postal_code: "75002",
  country_code: "fr",
  phone: "+33100000000",
}

// Tests that need SKUs set them, and put the business's nulls back afterwards.
const withSkus = () => {
  beforeEach(() => {
    PRODIGI_SKUS["30x40"].none = "TEST-SKU-30X40"
    PRODIGI_SKUS["45x60"].black = "TEST-SKU-45X60-BLACK"
    PRODIGI_ITEM_ATTRIBUTES.black = { color: "black" }
  })
  afterEach(() => {
    PRODIGI_SKUS["30x40"].none = null
    PRODIGI_SKUS["45x60"].black = null
    PRODIGI_ITEM_ATTRIBUTES.black = {}
  })
}

describe("prodigiSettings (env gating)", () => {
  it("is off without a key, sandbox by default", () => {
    expect(prodigiSettings({})).toEqual({ configured: false, env: "sandbox", reason: "Prodigi is off: PRODIGI_API_KEY is empty" })
    expect(prodigiSettings({ PRODIGI_API_KEY: "  " }).configured).toBe(false)
    expect(prodigiSettings({ PRODIGI_API_KEY: "k" })).toEqual({
      configured: true,
      env: "sandbox",
      config: { apiKey: "k", env: "sandbox", baseUrl: "https://api.sandbox.prodigi.com/v4.0/" },
    })
  })

  it("refuses live outside production", () => {
    const dev = prodigiSettings({ PRODIGI_API_KEY: "k", PRODIGI_ENV: "live", NODE_ENV: "development" })
    expect(dev.configured).toBe(false)
    expect(!dev.configured && dev.reason).toMatch(/refused outside production/)
    expect(prodigiSettings({ PRODIGI_API_KEY: "k", PRODIGI_ENV: "live" }).configured).toBe(false)
    const prod = prodigiSettings({ PRODIGI_API_KEY: "k", PRODIGI_ENV: "LIVE", NODE_ENV: "production" })
    expect(prod.configured && prod.config.baseUrl).toBe("https://api.prodigi.com/v4.0/")
  })

  it("refuses an unknown environment", () => {
    const settings = prodigiSettings({ PRODIGI_API_KEY: "k", PRODIGI_ENV: "staging" })
    expect(settings).toMatchObject({ configured: false, env: "staging" })
  })

  it("gives no client when off", () => {
    expect(() => prodigiClient({})).toThrow(ProdigiError)
    try {
      prodigiClient({})
    } catch (error) {
      expect((error as ProdigiError).kind).toBe("precondition")
      expect(prodigiErrorStatus(error as ProdigiError)).toBe(409)
    }
  })
})

describe("ProdigiClient (request building and error mapping)", () => {
  it("posts an order with the API key to the sandbox", async () => {
    const fetchMock = answer(200, { outcome: "Created", order: { id: "ord_1", status: { stage: "InProgress" } } })
    const client = new ProdigiClient(SANDBOX, fetchMock as unknown as typeof fetch)
    const response = await client.createOrder({
      merchantReference: "SP-1",
      idempotencyKey: "medusa-order_1",
      shippingMethod: "Standard",
      recipient: { name: "Ada", address: { line1: "x", postalOrZipCode: "1", countryCode: "FR", townOrCity: "Paris" } },
      items: [{ sku: "S", copies: 1, sizing: "fillPrintArea", assets: [{ printArea: "default", url: "https://f/x.png" }] }],
    })
    expect(response.outcome).toBe("created")
    expect(response.order.id).toBe("ord_1")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.sandbox.prodigi.com/v4.0/orders")
    expect(init?.method).toBe("POST")
    expect(init?.headers).toMatchObject({ "X-API-Key": "test_key", "Content-Type": "application/json" })
    expect(JSON.parse(init?.body as string)).toMatchObject({ idempotencyKey: "medusa-order_1", shippingMethod: "Standard" })
  })

  it("accepts the outcomes after which Prodigi has the order", async () => {
    for (const outcome of ["OnHold", "CreatedWithIssues", "AlreadyExists", "created"]) {
      const client = new ProdigiClient(SANDBOX, answer(200, { outcome, order: { id: "ord_2" } }) as unknown as typeof fetch)
      await expect(client.createOrder({} as any)).resolves.toMatchObject({ outcome: normaliseOutcome(outcome) })
    }
  })

  it("asks for a quote and a product", async () => {
    const fetchMock = answer(200, { outcome: "Created", quotes: [] })
    const client = new ProdigiClient(SANDBOX, fetchMock as unknown as typeof fetch)
    await client.quote({ destinationCountryCode: "FR", currencyCode: "EUR", items: [{ sku: "S", copies: 1, assets: [{ printArea: "default" }] }] })
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.sandbox.prodigi.com/v4.0/quotes")
    await client.getProduct("GLOBAL-CFPM-16X20")
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-CFPM-16X20")
    expect(fetchMock.mock.calls[1][1]?.method).toBe("GET")
    expect(fetchMock.mock.calls[1][1]?.body).toBeUndefined()
  })

  const cases: [string, number, unknown, string, number][] = [
    ["a refused key", 401, { statusCode: 401 }, "auth", 502],
    ["a forbidden key", 403, "Forbidden", "auth", 502],
    ["a validation failure", 400, { outcome: "ValidationFailed", failures: { "recipient.address.postalOrZipCode": [{ code: "Required" }] } }, "validation", 422],
    ["an unknown SKU", 404, { outcome: "NotFound" }, "not_found", 404],
    ["rate limiting", 429, {}, "rate_limited", 503],
    ["a server error", 500, "oops", "server", 502],
  ]
  it.each(cases)("maps %s", async (_name, status, body, kind, httpStatus) => {
    const client = new ProdigiClient(SANDBOX, answer(status, body) as unknown as typeof fetch)
    const error = await client.getProduct("X").catch((e) => e)
    expect(error).toBeInstanceOf(ProdigiError)
    expect(error.kind).toBe(kind)
    expect(error.status).toBe(status)
    expect(prodigiErrorStatus(error)).toBe(httpStatus)
  })

  it("keeps Prodigi's validation details", async () => {
    const failures = { "items[0].sku": [{ code: "NotRecognised" }] }
    const client = new ProdigiClient(SANDBOX, answer(400, { outcome: "ValidationFailed", failures }) as unknown as typeof fetch)
    const error = await client.createOrder({} as any).catch((e) => e)
    expect(error.outcome).toBe("ValidationFailed")
    expect(error.details).toEqual(failures)
    expect(error.message).toMatch(/400 ValidationFailed \(items\[0\]\.sku\)/)
  })

  it("maps an unexpected outcome on a 200 to a validation error", async () => {
    const client = new ProdigiClient(SANDBOX, answer(200, { outcome: "ValidationFailed" }) as unknown as typeof fetch)
    await expect(client.createOrder({} as any)).rejects.toMatchObject({ kind: "validation", outcome: "ValidationFailed" })
  })

  it("maps a network failure and an unreadable answer", async () => {
    const down = new ProdigiClient(SANDBOX, (async () => {
      throw new TypeError("fetch failed")
    }) as unknown as typeof fetch)
    await expect(down.getProduct("X")).rejects.toMatchObject({ kind: "network" })
    const garbled = new ProdigiClient(SANDBOX, answer(200, "<html>") as unknown as typeof fetch)
    await expect(garbled.getProduct("X")).rejects.toMatchObject({ kind: "unexpected" })
  })
})

describe("order building", () => {
  it("maps a Medusa address to a recipient", () => {
    expect(prodigiRecipient(address, "ada@example.com")).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phoneNumber: "+33100000000",
      address: { line1: "12 Rue de la Paix", postalOrZipCode: "75002", countryCode: "FR", townOrCity: "Paris" },
    })
    expect(() => prodigiRecipient(null)).toThrow("no shipping address")
    expect(() => prodigiRecipient({ ...address, postal_code: "", city: " " })).toThrow("postal code, town or city")
  })

  it("picks the shipping method from Medusa's", () => {
    expect(prodigiShippingMethod("Express Shipping")).toBe("Express")
    expect(prodigiShippingMethod("Standard Shipping")).toBe("Standard")
    expect(prodigiShippingMethod(undefined)).toBe("Standard")
  })

  it("refuses while a SKU is null", () => {
    expect(missingProdigiSkus()).toHaveLength(12)
    expect(() =>
      buildProdigiOrder({
        orderId: "order_1",
        displayId: 1,
        shippingAddress: address,
        shippingMethod: "Standard",
        lines: [{ item_id: "a", quantity: 1, sizeId: "30x40", frameId: "none", assetUrl: "https://f/a.png" }],
      })
    ).toThrow(/No Prodigi SKU chosen for 30x40\/none/)
  })

  describe("with SKUs chosen", () => {
    withSkus()

    it("builds the order body", () => {
      expect(missingProdigiSkus()).toHaveLength(10)
      const body = buildProdigiOrder({
        orderId: "order_1",
        displayId: 42,
        email: "ada@example.com",
        shippingAddress: address,
        shippingMethod: "Express",
        lines: [
          { item_id: "a", quantity: 2, sizeId: "30x40", frameId: "none", assetUrl: "https://f/a.png" },
          { item_id: "b", quantity: 1, sizeId: "45x60", frameId: "black", assetUrl: "https://f/b.png" },
        ],
      })
      expect(body).toEqual({
        merchantReference: "SP-42",
        idempotencyKey: "medusa-order_1",
        shippingMethod: "Express",
        recipient: prodigiRecipient(address, "ada@example.com"),
        items: [
          { merchantReference: "a", sku: "TEST-SKU-30X40", copies: 2, sizing: "fillPrintArea", assets: [{ printArea: "default", url: "https://f/a.png" }] },
          {
            merchantReference: "b",
            sku: "TEST-SKU-45X60-BLACK",
            copies: 1,
            sizing: "fillPrintArea",
            attributes: { color: "black" },
            assets: [{ printArea: "default", url: "https://f/b.png" }],
          },
        ],
        metadata: { medusa_order_id: "order_1", display_id: 42 },
      })
    })
  })
})

describe("submitOrderToProdigi", () => {
  const printFile = { file_id: "file_1", width: 3600, height: 4799, size: "30x40", format: "png", rendered_at: "t" }
  const order = (extra: Record<string, unknown> = {}, itemMeta: Record<string, unknown> = {}) => ({
    id: "order_1",
    display_id: 5,
    email: "ada@example.com",
    metadata: { note: "keep" },
    shipping_address: address,
    shipping_methods: [{ name: "Standard Shipping" }],
    items: [
      {
        id: "item_1",
        quantity: 1,
        variant_sku: "SP-GLASS-30X40-NONE",
        variant: { metadata: { poster_size: "30x40", poster_frame: "none" } },
        metadata: { poster: { version: 1, design: { kind: "shader", id: "glass" }, print_file: printFile, ...itemMeta } },
      },
    ],
    ...extra,
  })

  const deps = (record: Record<string, unknown>, fetchImpl?: jest.Mock, url = "https://files.example.com/p.png") => {
    const updateOrders = jest.fn(async () => ({}))
    const d: ProdigiSubmitDeps = {
      query: { graph: jest.fn(async () => ({ data: [record] })) },
      files: { retrieveFile: jest.fn(async () => ({ url })) },
      orders: { updateOrders },
      client: () => prodigiClient({ PRODIGI_API_KEY: "test_key" }, (fetchImpl ?? answer(200, {})) as unknown as typeof fetch),
      now: () => new Date("2026-10-10T12:00:00Z"),
    }
    return { d, updateOrders }
  }

  it("refuses while Prodigi is off, before reading the order", async () => {
    const { d } = deps(order())
    d.client = () => prodigiClient({})
    await expect(submitOrderToProdigi(d, "order_1")).rejects.toMatchObject({ kind: "precondition", message: expect.stringMatching(/PRODIGI_API_KEY/) })
    expect(d.query.graph).not.toHaveBeenCalled()
  })

  it("refuses while the SKUs are null (409)", async () => {
    const { d } = deps(order())
    const error = await submitOrderToProdigi(d, "order_1").catch((e) => e)
    expect(error.kind).toBe("precondition")
    expect(prodigiErrorStatus(error)).toBe(409)
    expect(error.details).toEqual({ skusMissing: ["30x40/none"] })
  })

  describe("with SKUs chosen", () => {
    withSkus()

    it("refuses without print files", async () => {
      const { d } = deps(order({}, { print_file: undefined }))
      await expect(submitOrderToProdigi(d, "order_1")).rejects.toMatchObject({
        kind: "precondition",
        details: { printFilesMissing: ["item_1"] },
      })
    })

    it("refuses a local print file URL", async () => {
      const { d } = deps(order(), undefined, "http://localhost:9000/static/p.png")
      await expect(submitOrderToProdigi(d, "order_1")).rejects.toThrow(/local: Prodigi can't download it/)
      expect(isFetchableUrl("https://bucket.s3.amazonaws.com/p.png?sig=1")).toBe(true)
    })

    it("refuses an order already sent", async () => {
      const { d } = deps(order({ metadata: { prodigi: { order_id: "ord_9" } } }))
      await expect(submitOrderToProdigi(d, "order_1")).rejects.toThrow(/already sent to Prodigi \(ord_9\)/)
    })

    it("refuses an order without poster, and a missing order", async () => {
      await expect(submitOrderToProdigi(deps(order({ items: [] })).d, "order_1")).rejects.toThrow(/no shader poster/)
      const { d } = deps(order())
      d.query.graph = jest.fn(async () => ({ data: [] }))
      await expect(submitOrderToProdigi(d, "order_1")).rejects.toMatchObject({ kind: "not_found" })
    })

    it("sends the order and records Prodigi's id and outcome", async () => {
      const fetchMock = answer(200, { outcome: "Created", order: { id: "ord_840797", status: { stage: "InProgress" } } })
      const { d, updateOrders } = deps(order(), fetchMock)
      const submission = await submitOrderToProdigi(d, "order_1")
      expect(submission).toEqual({
        env: "sandbox",
        order_id: "ord_840797",
        outcome: "created",
        stage: "InProgress",
        shipping_method: "Standard",
        submitted_at: "2026-10-10T12:00:00.000Z",
        items: [{ item_id: "item_1", sku: "TEST-SKU-30X40", copies: 1 }],
      })
      const sent = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(sent.items[0].assets).toEqual([{ printArea: "default", url: "https://files.example.com/p.png" }])
      expect(sent.recipient.address.countryCode).toBe("FR")
      expect(updateOrders).toHaveBeenCalledWith("order_1", {
        metadata: { note: "keep", prodigi_error: null, prodigi: submission },
      })
    })

    it("records Prodigi's refusal and passes it on", async () => {
      const { d, updateOrders } = deps(order(), answer(400, { outcome: "ValidationFailed", failures: { x: [] } }))
      const error = await submitOrderToProdigi(d, "order_1", { shippingMethod: "Budget" }).catch((e) => e)
      expect(error.kind).toBe("validation")
      expect(prodigiErrorStatus(error)).toBe(422)
      expect(updateOrders).toHaveBeenCalledWith("order_1", {
        metadata: {
          note: "keep",
          prodigi_error: expect.objectContaining({ kind: "validation", outcome: "ValidationFailed" }),
        },
      })
    })
  })
})
