# Print renderer

Turns a ShaderPaper poster design into its print file. Headless Chrome opens the storefront's render page (`/render?d=…`) at the poster's logical size, with a device scale factor that gives the print resolution, waits until the page says the poster is drawn, then screenshots it.

Copied from MapAndSky (Méridien), where it rendered map posters. What changed for ShaderPaper: the page it opens (`/render` instead of `/{countryCode}/poster/render`), how the design travels in the URL (base64url JSON instead of lz-string), the package name, and the tests' sample design. The server, queue, geometry, validation and error handling are Méridien's.

The Medusa backend calls it after an order is placed (`apps/backend/src/workflows/render-poster-print-files.ts`), and stores the image as a private file on the order's line item.

```
Medusa (order.placed) ──POST /render──▶ print renderer ──▶ Chrome ──▶ storefront /render?d=…&size=…&mm=…
        ◀────────────── PNG ──────────────┘
```

## Render page contract (the storefront must implement it)

The storefront's `/render` page does not exist yet in this repository: `apps/storefront` builds it. Until it does, every render ends in a timeout (504) or a 404 page that never sets the flags below.

**URL.** `GET {STOREFRONT_URL}{RENDER_PATH}?d=<design>&size=<size id>&mm=<width>x<height>`, by default `http://localhost:3000/render?…`. Outside the `/{countryCode}` routes; `noindex`.

| Param | Value |
| --- | --- |
| `d` | The design: `JSON.stringify(design)`, UTF-8, then base64url (RFC 4648 §5: `-` and `_`, no `=` padding). In the browser: `JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(d.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))))`. |
| `size` | The size id: `30x40`, `45x60` or `60x80`. |
| `mm` | The physical size, portrait, in mm: `300x400`, `450x600`, `600x800`. |

`design` is the line item's `metadata.poster.design`, as the storefront put it in the cart:

```json
{ "kind": "shader", "id": "glass", "seed": 12.5, "knobs": [0.2, null, 0.7, 0.5], "palette": 2, "strength": "b" }
```

`id` is the catalogue id (`metadata.shader.id` of the product, e.g. `k_cpack`, whose product handle is `k-cpack`); `knobs[i]` is 0..1 or `null` (the seed decides); `palette` an index or `null`; `strength` `n`, `b` or `v`.

**Viewport.** The renderer opens the page at the logical size, short side 1000 CSS px: **1000 × 1333** for every current size (3:4), with `deviceScaleFactor` = output px / 1000 (3.6 for 30 × 40, 5.4 for 45 × 60, 6.0 for 60 × 80). The page must:

1. draw the poster full-bleed, filling exactly the viewport (no margin, border, shadow, scrollbar or UI);
2. draw at `devicePixelRatio`, i.e. a canvas of 3600 × 4798 to 6000 × 7998 device px. Do not cap the pixel ratio: the catalogue's `prep()` caps it at 2, and its shared WebGL buffer is a fixed 1040 × 1300 px; a print drawn that way would be an upscale. The render page needs an engine mode that renders at the requested size (SwiftShader draws at most 8192 px per side);
3. set `window.__POSTER_SIZE__ = { width, height }`, the poster's size in CSS px (must equal the viewport, 1000 × 1333, or the render fails as `design`);
4. set `window.__POSTER_READY__ = true` once the poster is completely drawn (WebGL work finished and composited, fonts loaded if any text is drawn);
5. or set `window.__POSTER_ERROR__ = '<reason>'` when the design is invalid (unknown id, bad JSON); the renderer answers 422 and the backend records the reason as the line's `print_error`.

Everything the page loads should come from the storefront's origin: a failed request to another origin fails the render (`network`, 502), as Méridien's map tiles did.

**Open question (product, not code).** The catalogue composes every poster at **4:5** (`.plate { aspect-ratio: 4/5 }`, GL buffer 1040 × 1300), but the print sizes copied from Méridien are **3:4**. The render page has to either recompose the poster at 3:4 (the shaders use `u_res` and most JS systems read the canvas size, so many will reflow), crop, or add margins, or ShaderPaper picks 4:5 print sizes (e.g. 16 × 20 in, the format of the example SKU `GLOBAL-CFPM-16X20` in Prodigi's docs; not checked against Prodigi's catalogue from here). Until that is decided, a 3:4 print is not what the customer saw in a 4:5 preview.

## Run

```bash
cp .env.example .env    # set RENDERER_TOKEN, and the same value as PRINT_RENDERER_TOKEN in apps/backend/.env
pnpm dev                # http://localhost:4000, restarts on changes
```

The storefront (port 3000) must be running and serve `/render`.

Render one file without the server:

```bash
pnpm render --link 'http://localhost:3000/render?d=…&size=45x60' --out poster.png   # size from the link, 300 dpi
pnpm render --design design.json --size 60x80 --px 6000x8000 --out poster.png
```

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server (Node runs the TypeScript sources directly, Node ≥ 22.18) |
| `pnpm render` | One render to a file (`--link` or `--design`, `--size`, `--mm`, `--dpi` or `--px`, `--format`, `--out`) |
| `pnpm test` | Unit tests (request validation, geometry, design encoding, render URL, queue) |
| `pnpm typecheck` | Type-checks `src/` |

## API

`POST /render` with `Authorization: Bearer <RENDERER_TOKEN>`:

```json
{
  "design": { "kind": "shader", "id": "glass", "seed": 12.5, "knobs": [0.2, null, 0.7, 0.5], "palette": 2, "strength": "b" },
  "size": { "id": "45x60", "widthMm": 450, "heightMm": 600 },
  "pixels": { "width": 5400, "height": 7200 },
  "format": "png"
}
```

`pixels` must match the size's ratio. `format` is `png` (default) or `jpeg` with `quality`. (`part`, a poster of one of Méridien's sets, is still accepted; ShaderPaper never sends it.)

The response is the image, with `X-Poster-Width` and `X-Poster-Height`. These can be a pixel off the request: the poster is laid out at 1000 × 1333 CSS px for 3:4, so 5400 px wide gives 7198 px high.

| Status | Meaning | Retry? |
| --- | --- | --- |
| 400 | Invalid request | no |
| 401 | Missing or wrong token | no |
| 422 | The render page rejected the design | no |
| 502 | A resource from another origin failed to load (the print would have holes) | yes |
| 503 | Queue full (`Retry-After`), or Chrome couldn't start | yes |
| 504 | The poster wasn't ready in time | yes |

`GET /health` returns `{ ok, active, queued }`.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `RENDERER_TOKEN` | — | Required when `NODE_ENV=production`. Without it (development), only localhost may call. |
| `PORT` / `HOST` | `4000` / `127.0.0.1` (`0.0.0.0` in production) | |
| `STOREFRONT_URL` | `http://localhost:3000` | Serves the render page |
| `RENDER_PATH` | `/render` | |
| `CHROME_PATH` | — | Chrome or Chromium binary. Without it, the installed Google Chrome (`CHROME_CHANNEL=chrome`) |
| `RENDER_GL` | `swiftshader` | Software WebGL: same output on any machine. `gpu` is faster where a GPU exists, but headless Chrome on macOS doesn't capture GPU WebGL |
| `RENDER_CONCURRENCY` | `1` | Renders at a time |
| `RENDER_QUEUE_LIMIT` | `10` | Waiting renders before answering 503 |
| `RENDER_TIMEOUT_MS` | `120000` | Per render |
| `RENDER_MAX_SIDE_PX` | `8192` | Largest side; SwiftShader can't draw a bigger canvas |

## Not measured for ShaderPaper

Méridien measured its map posters (MacBook, SwiftShader): about 16–19 s per render and 2.5 GB peak memory at 60 × 80 cm. Shader posters have not been rendered at print size yet (the render page doesn't exist); the heavier GL systems (raymarched 3D, glass, gyroid) may be much slower in software WebGL at 6000 × 8000 px. Measure before choosing `RENDER_TIMEOUT_MS` and the host.

## Deploying

- Any Linux host or container with Chrome or Chromium (`CHROME_PATH`), e.g. the `mcr.microsoft.com/playwright` image.
- Keep it private: only the Medusa backend calls it, with the token.
- Point `STOREFRONT_URL` at the production storefront, or at an internal address serving the same build.
