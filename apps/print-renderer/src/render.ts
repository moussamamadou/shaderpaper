import lzString from 'lz-string'
import { chromium, type Browser } from 'playwright-core'

import type { Config } from './config.ts'
import { renderGeometry, type ImageFormat, type RenderJob, type Size } from './job.ts'

export interface RenderResult {
  image: Buffer
  width: number
  height: number
  ms: number
}

/**
 * `design`: the render page rejected the input (don't retry). The others are
 * worth a retry: `timeout`, `network` (map tiles failed to load: the print would
 * have holes), `browser` (Chrome missing or crashed).
 */
export type RenderErrorKind = 'design' | 'timeout' | 'network' | 'browser'

export class RenderError extends Error {
  kind: RenderErrorKind
  constructor(kind: RenderErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

interface PageState {
  error: string | null
  size: Size | null
}

/** Width and height from a PNG (IHDR) or JPEG (SOFn) header. */
export function imageSize(image: Buffer, format: ImageFormat): Size {
  if (format === 'png') return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) }
  let offset = 2
  while (offset + 9 < image.length) {
    const marker = image[offset + 1]!
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { width: image.readUInt16BE(offset + 7), height: image.readUInt16BE(offset + 5) }
    offset += 2 + image.readUInt16BE(offset + 2)
  }
  throw new Error('Unreadable JPEG')
}

/**
 * Opens the storefront's poster render page in headless Chrome, at the job's
 * logical size and a device scale factor giving the print resolution, waits
 * until the map is drawn and fonts are loaded, then captures the page.
 */
export class PosterRenderer {
  #config: Config
  #browser: Promise<Browser> | null = null

  constructor(config: Config) {
    this.#config = config
  }

  #launch(): Promise<Browser> {
    const { channel, executablePath, gl } = this.#config.chrome
    const args = ['--hide-scrollbars', '--mute-audio', '--disable-dev-shm-usage', '--font-render-hinting=none']
    // Software WebGL: identical output on any machine, and headless Chrome on macOS
    // doesn't composite GPU WebGL into screenshots.
    if (gl === 'swiftshader') args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader')

    this.#browser ??= chromium
      .launch({ headless: true, args, ...(executablePath ? { executablePath } : { channel }) })
      .then((browser) => {
        browser.on('disconnected', () => (this.#browser = null))
        return browser
      })
      .catch((error: Error) => {
        this.#browser = null
        throw new RenderError('browser', `Could not start Chrome: ${error.message.split('\n')[0]}`)
      })
    return this.#browser
  }

  renderUrl(job: RenderJob): string {
    const url = new URL(this.#config.renderPath, this.#config.storefrontUrl)
    url.searchParams.set('d', lzString.compressToEncodedURIComponent(JSON.stringify(job.design)))
    url.searchParams.set('size', job.size.id)
    url.searchParams.set('mm', `${job.size.widthMm}x${job.size.heightMm}`)
    if (job.part) url.searchParams.set('part', job.part)
    return url.href
  }

  async render(job: RenderJob): Promise<RenderResult> {
    const started = performance.now()
    const deadline = started + this.#config.timeoutMs
    const { viewport, scale } = renderGeometry(job)
    const browser = await this.#launch()
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale })

    // Map tiles, glyphs and sprites come from other origins than the storefront; a
    // failed one leaves a hole in the map, so it fails the render.
    const storefront = new URL(this.#config.storefrontUrl).origin
    const failures: string[] = []
    const pageErrors: string[] = []
    context.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? 'failed'
      if (!reason.includes('ERR_ABORTED') && new URL(request.url()).origin !== storefront) {
        failures.push(`${reason} ${request.url()}`)
      }
    })
    context.on('response', (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin !== storefront) {
        failures.push(`HTTP ${response.status()} ${response.url()}`)
      }
    })

    try {
      const page = await context.newPage()
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.goto(this.renderUrl(job), { waitUntil: 'domcontentloaded', timeout: this.#config.timeoutMs })

      try {
        await page.waitForFunction('window.__POSTER_READY__ === true || Boolean(window.__POSTER_ERROR__)', undefined, {
          timeout: Math.max(1000, deadline - performance.now()),
          polling: 100,
        })
      } catch {
        const details = [...failures, ...pageErrors].slice(0, 3).join('; ')
        throw new RenderError('timeout', `Poster not ready after ${this.#config.timeoutMs} ms${details ? ` (${details})` : ''}`)
      }

      const state = (await page.evaluate(
        '({ error: window.__POSTER_ERROR__ ?? null, size: window.__POSTER_SIZE__ ?? null })',
      )) as PageState
      if (state.error) throw new RenderError('design', `The render page rejected the design (${state.error})`)
      if (state.size?.width !== viewport.width || state.size?.height !== viewport.height) {
        throw new RenderError(
          'design',
          `The design lays out at ${state.size?.width}×${state.size?.height}, not ${viewport.width}×${viewport.height}: check its orientation and size`,
        )
      }
      if (failures.length) {
        throw new RenderError('network', `Map resources failed to load: ${failures.slice(0, 3).join('; ')}`)
      }

      // Device pixels (viewport × scale). A viewport capture doesn't resize the
      // page, so the map isn't redrawn.
      const image = await page.screenshot({
        type: job.format,
        ...(job.format === 'jpeg' ? { quality: job.quality } : {}),
        scale: 'device',
        caret: 'hide',
        timeout: Math.max(1000, deadline - performance.now()),
      })
      return { image, ...imageSize(image, job.format), ms: Math.round(performance.now() - started) }
    } finally {
      await context.close().catch(() => {})
    }
  }

  async close(): Promise<void> {
    const browser = await this.#browser?.catch(() => null)
    this.#browser = null
    await browser?.close()
  }
}
