export type GlMode = 'swiftshader' | 'gpu'

export interface Config {
  port: number
  host: string
  /** Bearer token callers must send; null only outside production (then loopback callers only). */
  token: string | null
  production: boolean
  /** Origin serving the render page, e.g. http://localhost:3000. */
  storefrontUrl: string
  /** Render page path (the storefront's `/render`, outside the country routes). */
  renderPath: string
  chrome: { channel: string; executablePath?: string; gl: GlMode }
  concurrency: number
  queueLimit: number
  timeoutMs: number
  /**
   * Largest output side, in px. Software WebGL (SwiftShader) draws at most
   * 8192 px, and a larger canvas would silently lose resolution.
   */
  maxSidePx: number
}

function int(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`)
  }
  return value
}

export function loadConfig(): Config {
  const production = process.env.NODE_ENV === 'production'
  const token = process.env.RENDERER_TOKEN?.trim() || null
  if (production && !token) throw new Error('RENDERER_TOKEN is required in production')

  const gl = process.env.RENDER_GL ?? 'swiftshader'
  if (gl !== 'swiftshader' && gl !== 'gpu') throw new Error('RENDER_GL must be "swiftshader" or "gpu"')

  const storefrontUrl = new URL(process.env.STOREFRONT_URL ?? 'http://localhost:3000').origin
  const renderPath = process.env.RENDER_PATH ?? '/render'
  if (!renderPath.startsWith('/')) throw new Error('RENDER_PATH must start with "/"')

  return {
    port: int('PORT', 4000, 1, 65535),
    host: process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
    token,
    production,
    storefrontUrl,
    renderPath,
    chrome: {
      channel: process.env.CHROME_CHANNEL ?? 'chrome',
      executablePath: process.env.CHROME_PATH || undefined,
      gl,
    },
    concurrency: int('RENDER_CONCURRENCY', 1, 1, 8),
    queueLimit: int('RENDER_QUEUE_LIMIT', 10, 0, 1000),
    timeoutMs: int('RENDER_TIMEOUT_MS', 120_000, 5_000, 600_000),
    maxSidePx: int('RENDER_MAX_SIDE_PX', 8192, 256, 16384),
  }
}
