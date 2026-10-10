import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { loadConfig } from './config.ts'
import { JobError, parseJob } from './job.ts'
import { BusyError, Limiter } from './limiter.ts'
import { PosterRenderer, RenderError, type RenderErrorKind } from './render.ts'

/**
 * POST /render  { design, size, pixels, format?, quality? } → the image (see README.md)
 * GET  /health
 */

const MAX_BODY_BYTES = 256 * 1024
const RENDER_STATUS: Record<RenderErrorKind, number> = { design: 422, timeout: 504, network: 502, browser: 503 }

const config = loadConfig()
const renderer = new PosterRenderer(config)
const limiter = new Limiter(config.concurrency, config.queueLimit)

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function authorized(req: IncomingMessage): boolean {
  // Without a token (development only), only this machine may call.
  if (!config.token) return LOOPBACK.has(req.socket.remoteAddress ?? '')
  const expected = Buffer.from(`Bearer ${config.token}`)
  const actual = Buffer.from(req.headers.authorization ?? '')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'Body must be JSON')
  }
}

function sendJson(res: ServerResponse, status: number, body: object, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify(body))
}

function sendError(res: ServerResponse, error: unknown): number {
  if (error instanceof JobError) return sendJson(res, 400, { error: error.message }), 400
  if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message }), error.status
  if (error instanceof BusyError) return sendJson(res, 503, { error: error.message }, { 'retry-after': '30' }), 503
  if (error instanceof RenderError) {
    const status = RENDER_STATUS[error.kind]
    sendJson(res, status, { error: error.message, kind: error.kind })
    return status
  }
  console.error('[print-renderer]', error)
  sendJson(res, 500, { error: 'Render failed' })
  return 500
}

const server = createServer(async (req, res) => {
  const started = performance.now()
  const { pathname } = new URL(req.url ?? '/', 'http://renderer')
  let status = 200
  let detail = ''
  try {
    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { ok: true, active: limiter.active, queued: limiter.queued })
    }
    if (pathname !== '/render') throw new HttpError(404, 'Not found')
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST')
    if (!authorized(req)) throw new HttpError(401, 'Unauthorized')

    const job = parseJob(await readJson(req), config.maxSidePx)
    const result = await limiter.run(() => renderer.render(job))
    res.writeHead(200, {
      'content-type': job.format === 'png' ? 'image/png' : 'image/jpeg',
      'content-length': result.image.length,
      'x-poster-width': result.width,
      'x-poster-height': result.height,
      'x-render-ms': result.ms,
    })
    res.end(result.image)
    detail = `${job.size.id} ${result.width}×${result.height} ${(result.image.length / 1e6).toFixed(1)} MB`
  } catch (error) {
    status = sendError(res, error)
    detail = error instanceof Error ? error.message : ''
  } finally {
    if (pathname !== '/health') {
      console.log(`${req.method} ${pathname} ${status} ${Math.round(performance.now() - started)} ms ${detail}`.trim())
    }
  }
})

server.listen(config.port, config.host, () => {
  console.log(
    `Print renderer on http://${config.host}:${config.port} → ${config.storefrontUrl}${config.renderPath} ` +
      `(${config.chrome.gl}, ${config.concurrency} at a time${config.token ? '' : ', no token: localhost only'})`,
  )
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void renderer.close().finally(() => process.exit(0))
  })
}
