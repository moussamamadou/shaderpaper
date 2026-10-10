# Print renderer

Turns a custom map poster design into its print file. Headless Chrome opens the storefront's print page (`/{countryCode}/poster/render`) at the poster's logical size, with a device scale factor that gives the print resolution, waits until the map is drawn and the fonts are loaded, then screenshots it.

The Medusa backend calls it after an order is placed (`apps/backend/src/workflows/render-poster-print-files.ts`), and stores the image as a private file on the order's line item.

```
Medusa (order.placed) ──POST /render──▶ print renderer ──▶ Chrome ──▶ storefront /fr/poster/render?d=…
        ◀────────────── PNG ──────────────┘
```

## Run

```bash
cp .env.example .env    # set RENDERER_TOKEN, and the same value as PRINT_RENDERER_TOKEN in apps/backend/.env
pnpm dev                # http://localhost:4000, restarts on changes
```

The storefront (port 3000) and Medusa (port 9000) must be running: the render page is served by the storefront, whose region middleware calls Medusa. The machine needs internet access for the map tiles.

Render one file without the server, e.g. from a share link:

```bash
pnpm render --link 'http://localhost:3000/fr/poster?d=…' --out poster.png          # size from the design, 300 dpi
pnpm render --design design.json --size 60x80 --px 6000x8000 --out poster.png
```

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server (Node runs the TypeScript sources directly, Node ≥ 22.18) |
| `pnpm render` | One render to a file (`--link` or `--design`, `--size`, `--mm`, `--dpi` or `--px`, `--format`, `--out`) |
| `pnpm test` | Unit tests (request validation, geometry, queue) |
| `pnpm typecheck` | Type-checks `src/` |

## API

`POST /render` with `Authorization: Bearer <RENDERER_TOKEN>`:

```json
{
  "design": { "version": 1, "product": { "sizeId": "45x60", "orientation": "portrait" } },
  "size": { "id": "45x60", "widthMm": 450, "heightMm": 600 },
  "pixels": { "width": 5400, "height": 7200 },
  "format": "png"
}
```

`design` is the storefront's `PosterDesign` (abridged above). `pixels` must match the size's ratio in the design's orientation. `format` is `png` (default) or `jpeg` with `quality`.

The response is the image, with `X-Poster-Width` and `X-Poster-Height`. These can be a pixel off the request: the poster is laid out at 1000 × 1333 CSS px for 3:4, so 5400 px wide gives 7198 px high.

| Status | Meaning | Retry? |
| --- | --- | --- |
| 400 | Invalid request | no |
| 401 | Missing or wrong token | no |
| 422 | The render page rejected the design | no |
| 502 | Map tiles failed to load (the print would have holes) | yes |
| 503 | Queue full (`Retry-After`), or Chrome couldn't start | yes |
| 504 | The poster wasn't ready in time | yes |

`GET /health` returns `{ ok, active, queued }`.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `RENDERER_TOKEN` | — | Required when `NODE_ENV=production`. Without it (development), only localhost may call. |
| `PORT` / `HOST` | `4000` / `127.0.0.1` (`0.0.0.0` in production) | |
| `STOREFRONT_URL` | `http://localhost:3000` | Serves the render page |
| `RENDER_PATH` | `/fr/poster/render` | Needs a country code the storefront knows |
| `CHROME_PATH` | — | Chrome or Chromium binary. Without it, the installed Google Chrome (`CHROME_CHANNEL=chrome`) |
| `RENDER_GL` | `swiftshader` | Software WebGL: same output on any machine. `gpu` is faster where a GPU exists, but headless Chrome on macOS doesn't capture GPU WebGL |
| `RENDER_CONCURRENCY` | `1` | Renders at a time |
| `RENDER_QUEUE_LIMIT` | `10` | Waiting renders before answering 503 |
| `RENDER_TIMEOUT_MS` | `120000` | Per render |
| `RENDER_MAX_SIDE_PX` | `8192` | Largest side; SwiftShader can't draw a bigger map canvas |

## Measured (MacBook, SwiftShader)

| Size | Pixels | PNG | Time |
| --- | --- | --- | --- |
| 30 × 40 cm | 3600 × 4799 | 3.7 MB | ~16 s |
| 45 × 60 cm | 5400 × 7198 | 6.5 MB | ~19 s |
| 60 × 80 cm | 6000 × 7998 | 5.7 MB | ~19 s, ~2.5 GB peak memory |

## Deploying

- Any Linux host or container with Chrome or Chromium (`CHROME_PATH`), e.g. the `mcr.microsoft.com/playwright` image. Chrome needs about 2.5 GB of memory per concurrent render at 60 × 80 cm.
- Keep it private: only the Medusa backend calls it, with the token.
- Point `STOREFRONT_URL` at the production storefront, or at an internal address serving the same build.
