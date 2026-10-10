import {
  posterPrintJob,
  printPixels,
  supersededPrintFiles,
  withPrintOutcome,
  type PosterPrintFile,
} from "../print-files"
import { printRendererConfig, renderPrintImage, renderRequestBody } from "../print-renderer"

const design = { kind: "shader", id: "glass", seed: 12.5, knobs: [0.2, null, 0.7, 0.5], palette: 2, strength: "b" }
const poster = (extra: Record<string, unknown> = {}) => ({ poster: { version: 1, design, title: "Glass", ...extra } })
const file = (id: string): PosterPrintFile => ({
  file_id: id,
  width: 5400,
  height: 7198,
  size: "45x60",
  format: "png",
  rendered_at: "2026-10-10T00:00:00.000Z",
})
const variant = (size: string, frame = "none") => ({ metadata: { poster_size: size, poster_frame: frame } })

describe("posterPrintJob", () => {
  it("renders shader poster lines at their variant's size, and skips the rest", () => {
    const job = posterPrintJob({
      id: "order_1",
      display_id: 7,
      items: [
        { id: "a", metadata: poster(), variant: variant("45x60") },
        { id: "b", metadata: { other: true }, variant: variant("30x40") },
        { id: "c", metadata: poster({ print_file: file("f1") }), variant: variant("30x40") },
        { id: "d", metadata: { poster: { design: { ...design, kind: "map" } } }, variant: variant("30x40") },
        { id: "e", metadata: { poster: { design: { ...design, id: "nope" } } }, variant: variant("30x40") },
        { id: "f", metadata: poster(), variant: variant("99x99") },
        // Variant deleted since: the size comes from the SKU.
        { id: "g", metadata: poster(), variant: null, variant_sku: "SP-GLASS-60X80-BLACK" },
        null,
      ],
    })
    expect(job.order_id).toBe("order_1")
    expect(job.display_id).toBe(7)
    expect(job.items.map((i) => [i.item_id, i.size.id])).toEqual([
      ["a", "45x60"],
      ["g", "60x80"],
    ])
    expect(job.items[0].design).toEqual(design)
    expect(job.skipped).toEqual([
      { item_id: "d", message: 'Unknown design kind "map"' },
      { item_id: "e", message: 'Unknown poster "nope"' },
      { item_id: "f", message: 'Unknown poster size "99x99"' },
    ])
  })

  it("renders lines that have a file again with force", () => {
    const order = { id: "o", items: [{ id: "c", metadata: poster({ print_file: file("f1") }), variant: variant("30x40") }] }
    expect(posterPrintJob(order).items).toHaveLength(0)
    expect(posterPrintJob(order, true).items).toHaveLength(1)
  })

  it("prints portrait at the size's print pixels", () => {
    const [item] = posterPrintJob({ id: "o", items: [{ id: "a", metadata: poster(), variant: variant("60x80") }] }).items
    expect(printPixels(item)).toEqual({ width: 6000, height: 8000 })
    expect(renderRequestBody(item)).toEqual({
      design,
      size: { id: "60x80", widthMm: 600, heightMm: 800 },
      pixels: { width: 6000, height: 8000 },
      format: "png",
    })
  })
})

describe("withPrintOutcome", () => {
  it("records a file and clears an earlier error, keeping the rest", () => {
    const before = { other: 1, ...poster({ print_error: { message: "x", at: "t" } }) }
    const after = withPrintOutcome(before, { print_file: file("f2") })
    expect(after).toEqual({ other: 1, poster: { version: 1, design, title: "Glass", print_file: file("f2") } })
  })

  it("records a failure", () => {
    const after = withPrintOutcome(poster(), { error: "boom", at: "t" })
    expect((after.poster as any).print_error).toEqual({ message: "boom", at: "t" })
  })
})

describe("supersededPrintFiles", () => {
  it("lists the files a forced render replaced", () => {
    const items = [
      { id: "a", metadata: poster({ print_file: file("old") }) },
      { id: "b", metadata: poster() },
    ]
    expect(
      supersededPrintFiles(items, [
        { item_id: "a", print_file: file("new") },
        { item_id: "b", print_file: file("nb") },
      ])
    ).toEqual(["old"])
  })
})

describe("print renderer client", () => {
  it("reads its config from the environment", () => {
    expect(printRendererConfig({})).toBeNull()
    expect(printRendererConfig({ PRINT_RENDERER_URL: "http://localhost:4000/", PRINT_RENDERER_TOKEN: " t " })).toEqual({
      url: "http://localhost:4000",
      token: "t",
    })
  })

  it("posts the job with the token and reads the image size headers", async () => {
    const [item] = posterPrintJob({ id: "o", items: [{ id: "a", metadata: poster(), variant: variant("30x40") }] }).items
    const fetchMock = jest.fn(async () =>
      new Response(Buffer.from([1, 2, 3]), { status: 200, headers: { "x-poster-width": "3600", "x-poster-height": "4799" } })
    )
    const result = await renderPrintImage({ url: "http://r", token: "tok" }, item, fetchMock as unknown as typeof fetch)
    expect(result.width).toBe(3600)
    expect(result.height).toBe(4799)
    expect(result.image).toEqual(Buffer.from([1, 2, 3]))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://r/render")
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok")
    expect(JSON.parse(init.body as string).size).toEqual({ id: "30x40", widthMm: 300, heightMm: 400 })
  })

  it("reports the renderer's error", async () => {
    const [item] = posterPrintJob({ id: "o", items: [{ id: "a", metadata: poster(), variant: variant("30x40") }] }).items
    const fetchMock = jest.fn(async () => Response.json({ error: "The render page rejected the design" }, { status: 422 }))
    await expect(renderPrintImage({ url: "http://r" }, item, fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "Print renderer answered 422: The render page rejected the design"
    )
  })
})
