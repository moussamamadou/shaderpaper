/**
 * The poster art's aspect ratio, in one place.
 *
 * The engine composes every poster on a 3:4 sheet (explorations/index.html,
 * `SHEET_AR`), the aspect of the print sizes on sale (30 × 40, 45 × 60,
 * 60 × 80 cm), so the art fills the print with nothing cropped. The engine
 * still renders the earlier 4:5 sheet with `ar=4:5`; going back would mean
 * changing these two numbers, passing `ar=4:5` to the engine and re-rendering
 * the thumbnails (scripts/render-poster-images.mjs). Tailwind's
 * `aspect-poster` and `aspect-thumb` classes read this constant too.
 */
export const POSTER_ASPECT = { w: 3, h: 4 } as const

/** CSS `aspect-ratio` value, e.g. "3 / 4". */
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
