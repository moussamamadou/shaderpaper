import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import { POSTER_ASPECT_CSS } from './shared/utils/aspect'

/**
 * The ShaderPaper theme, generated from docs/storefront/tokens.json (the same
 * file the Figma variables come from). Change a value there, not here.
 *
 * - colors, radii, shadows, breakpoints and motion replace Tailwind's defaults,
 *   so only token values exist (`bg-paper`, `text-ink-3`, `rounded-xs`,
 *   `shadow-poster`…);
 * - spacing is the token scale under Tailwind's usual keys (1 = 4 px … 32 = 128 px)
 *   plus the hit target (11 = 44 px) and the header heights;
 * - the type scale is a set of component classes, `type-h1`, `type-label`…,
 *   mobile size first and the desktop size from `lg`.
 */
type TypeStyle = {
  family: 'sans' | 'mono'
  weight: number
  size: number
  line: number
  tracking: number
  case?: 'upper'
  numeric?: 'tabular'
  mobile?: { size: number; line: number }
}
type Tokens = {
  color: Record<string, string>
  font: { sans: string; mono: string }
  type: Record<string, TypeStyle>
  space: number[]
  radius: Record<string, number>
  shadow: Record<string, string>
  breakpoint: Record<string, number>
  motion: { fast: string; base: string; slow: string; ease: string }
  layout: { maxWidth: number; headerHeight: number; headerHeightMobile: number; drawerWidth: number }
}

const tokens: Tokens = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../docs/storefront/tokens.json', import.meta.url)), 'utf8'),
)

const px = (n: number) => `${n}px`

/** Tailwind's own keys for the token spacing values (1 = 4 px). */
const spacing: Record<string, string> = { px: '1px' }
for (const v of tokens.space) spacing[String(v / 4)] = px(v)
spacing['11'] = '44px' // minimum hit target on touch screens
spacing['14'] = px(tokens.layout.headerHeightMobile)
spacing['header'] = px(tokens.layout.headerHeight)
spacing['header-m'] = px(tokens.layout.headerHeightMobile)
spacing['drawer'] = px(tokens.layout.drawerWidth)

const radius: Record<string, string> = { DEFAULT: px(tokens.radius.xs ?? 2) }
for (const [k, v] of Object.entries(tokens.radius)) radius[k] = v >= 999 ? '9999px' : px(v)

const familyStack = {
  sans: [`"${tokens.font.sans} Variable"`, `"${tokens.font.sans}"`, 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  mono: [`"${tokens.font.mono} Variable"`, `"${tokens.font.mono}"`, 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}

function typeRule(t: TypeStyle, size: number, line: number) {
  return {
    fontFamily: familyStack[t.family].join(', '),
    fontWeight: String(t.weight),
    fontSize: px(size),
    lineHeight: px(line),
    letterSpacing: t.tracking ? `${t.tracking / 100}em` : '0',
    ...(t.case === 'upper' ? { textTransform: 'uppercase' } : {}),
    ...(t.numeric === 'tabular' ? { fontVariantNumeric: 'tabular-nums' } : {}),
  }
}

const typeScale = plugin(({ addComponents }) => {
  const rules: Record<string, Record<string, unknown>> = {}
  const lg = `@media (min-width: ${tokens.breakpoint.lg}px)`
  for (const [name, t] of Object.entries(tokens.type)) {
    if (t.mobile) {
      rules[`.type-${name}`] = { ...typeRule(t, t.mobile.size, t.mobile.line), [lg]: { fontSize: px(t.size), lineHeight: px(t.line) } }
    } else {
      rules[`.type-${name}`] = typeRule(t, t.size, t.line)
    }
  }
  addComponents(rules)
})

const reducedMotion = plugin(({ addVariant }) => {
  addVariant('reduced', '@media (prefers-reduced-motion: reduce)')
})

export default {
  content: ['./app/**/*.{vue,js,ts}'],
  theme: {
    screens: Object.fromEntries(Object.entries(tokens.breakpoint).map(([k, v]) => [k, px(v)])),
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',
      black: '#000000',
      ...tokens.color,
    },
    spacing,
    borderRadius: radius,
    boxShadow: { ...tokens.shadow, none: 'none' },
    fontFamily: familyStack,
    transitionDuration: {
      DEFAULT: tokens.motion.base,
      fast: tokens.motion.fast,
      base: tokens.motion.base,
      slow: tokens.motion.slow,
      0: '0ms',
    },
    transitionTimingFunction: { DEFAULT: tokens.motion.ease, ease: tokens.motion.ease, linear: 'linear' },
    extend: {
      maxWidth: { content: px(tokens.layout.maxWidth), prose: '68ch', drawer: px(tokens.layout.drawerWidth) },
      width: { drawer: px(tokens.layout.drawerWidth) },
      // poster: the art's aspect (shared/utils/aspect.ts); thumb: catalogue plates.
      aspectRatio: { poster: POSTER_ASPECT_CSS, thumb: POSTER_ASPECT_CSS },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'rise-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        shimmer: `shimmer 1.4s linear infinite`,
        'slide-in-right': `slide-in-right ${tokens.motion.slow} ${tokens.motion.ease}`,
        'fade-in': `fade-in ${tokens.motion.base} ${tokens.motion.ease}`,
        'rise-in': `rise-in ${tokens.motion.base} ${tokens.motion.ease}`,
        spin: 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [typeScale, reducedMotion],
} satisfies Config
