/**
 * The poster art's aspect ratio, in one place.
 *
 * Open decision (business input): the engine composes every poster at 4:5,
 * while the print sizes on sale (30 × 40, 45 × 60, 60 × 80 cm) are 3:4. Until
 * that is settled the storefront shows the art at its native 4:5 (preview,
 * frame mockup, cart thumbnails), and the print render page centres the 4:5
 * art on the 3:4 sheet. Switching to 3:4 is a change of these two numbers
 * (and a rebuild, since the Tailwind `aspect-poster` class reads them too).
 */
export const POSTER_ASPECT = { w: 4, h: 5 } as const

/** CSS `aspect-ratio` value, e.g. "4 / 5". */
export const POSTER_ASPECT_CSS = `${POSTER_ASPECT.w} / ${POSTER_ASPECT.h}`

/** Height of the art for a given width. */
export const posterHeightFor = (width: number) => (width * POSTER_ASPECT.h) / POSTER_ASPECT.w

/**
 * The art's box inside a page of `page` size, centred, at its own aspect
 * ("contain"): the whole page when the aspects match.
 */
export function fitArt(page: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
  const ratio = POSTER_ASPECT.w / POSTER_ASPECT.h
  let width = page.width
  let height = width / ratio
  if (height > page.height) {
    height = page.height
    width = height * ratio
  }
  width = Math.round(width)
  height = Math.round(height)
  return { x: Math.round((page.width - width) / 2), y: Math.round((page.height - height) / 2), width, height }
}
