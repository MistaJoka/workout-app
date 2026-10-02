// Pixel art for the weekly boss-battle roster (src/domain/game/bosses.ts):
// eight small crisp-edge critters on a 16x14 grid, drawn from a shared
// parametric body (a silhouette profile + two-tone shading) plus a couple
// of per-boss decorations (wings, claws, a tiny crown...), so each stays
// distinct while sharing one cute, non-scary body language. One shared
// sprite wrapper drives idle bob (full motion only -- it carries no
// information, so it's fine to drop), a one-shot hurt shake+flash, and the
// defeated "poof of petals" pose; reduced/off motion keep the flash and the
// poof's end state (CLAUDE.md: motion must never remove information).

import type { Boss } from '../../domain/game/bosses'

type Palette = { body: string; bodyDark: string; accent: string; accentDark: string }
type EyeStyle = 'round' | 'sleepy' | 'fangy'
type Decoration = { x: number; y: number; w: number; h: number; color: keyof Palette | 'fang' }

type BossArtDef = {
  // Half-width (0-8) per row of the 16-wide, 12-tall body, centered unless
  // shifted by `offsets` (same length) -- a serpent's coil, say.
  profile: number[]
  offsets?: number[]
  eyeStyle: EyeStyle
  eyeRow: number
  eyeSpread: number
  decorations?: Decoration[]
}

const INK = '#2b2d42'
const FANG = '#fff6d8'
const PETAL = '#ff8fb8'
const PETAL_DARK = '#f06a9e'

const PALETTES: Record<string, Palette> = {
  'plank-dragon': { body: '#8ec5ff', bodyDark: '#5a8fd6', accent: '#5bbf8a', accentDark: '#3f9d6e' },
  'squat-slime': { body: '#9ee6c4', bodyDark: '#6cc9a0', accent: '#5bbf8a', accentDark: '#3f9d6e' },
  'lunge-golem': { body: '#d9c8a8', bodyDark: '#b39b6e', accent: '#8a5a44', accentDark: '#6b4432' },
  'crunch-crab': { body: '#ff9f7a', bodyDark: '#e8782a', accent: '#ff6b6b', accentDark: '#e0404a' },
  'burpee-bat': { body: '#c9a7ff', bodyDark: '#9a82e6', accent: '#2b2d42', accentDark: '#1c1d2c' },
  'stretch-serpent': { body: '#9ccaff', bodyDark: '#6fa8ec', accent: '#ffe08a', accentDark: '#f5b942' },
  'couch-kraken': { body: '#a35bd6', bodyDark: '#7d3cb0', accent: '#ffb27a', accentDark: '#e0874e' },
  'sleepy-sloth-king': { body: '#c9a06a', bodyDark: '#a67a46', accent: '#ffd966', accentDark: '#f2b829' },
}

const ARTS: Record<string, BossArtDef> = {
  'plank-dragon': {
    profile: [0, 1, 2, 3, 4, 4, 4, 4, 4, 3, 2, 0],
    eyeStyle: 'round',
    eyeRow: 5,
    eyeSpread: 2,
    decorations: [
      { x: 0, y: 4, w: 2, h: 1, color: 'accent' },
      { x: 14, y: 4, w: 2, h: 1, color: 'accent' },
      { x: 7, y: 0, w: 2, h: 1, color: 'accentDark' },
    ],
  },
  'squat-slime': {
    profile: [0, 0, 0, 2, 4, 6, 7, 7, 7, 6, 4, 0],
    eyeStyle: 'round',
    eyeRow: 6,
    eyeSpread: 3,
    decorations: [
      { x: 7, y: 12, w: 2, h: 2, color: 'body' },
      { x: 3, y: 12, w: 1, h: 1, color: 'accent' },
      { x: 11, y: 13, w: 1, h: 1, color: 'accent' },
    ],
  },
  'lunge-golem': {
    profile: [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 0],
    eyeStyle: 'round',
    eyeRow: 5,
    eyeSpread: 3,
    decorations: [
      { x: 4, y: 3, w: 1, h: 1, color: 'accentDark' },
      { x: 11, y: 7, w: 1, h: 1, color: 'accentDark' },
    ],
  },
  'crunch-crab': {
    profile: [0, 0, 2, 4, 6, 7, 7, 7, 6, 4, 2, 0],
    eyeStyle: 'round',
    eyeRow: 4,
    eyeSpread: 2,
    decorations: [
      { x: 0, y: 5, w: 1, h: 2, color: 'accent' },
      { x: 15, y: 5, w: 1, h: 2, color: 'accent' },
      { x: 0, y: 4, w: 1, h: 1, color: 'accentDark' },
      { x: 15, y: 4, w: 1, h: 1, color: 'accentDark' },
      { x: 3, y: 12, w: 1, h: 1, color: 'accentDark' },
      { x: 12, y: 12, w: 1, h: 1, color: 'accentDark' },
    ],
  },
  'burpee-bat': {
    profile: [1, 2, 3, 4, 4, 4, 4, 4, 3, 2, 1, 0],
    eyeStyle: 'fangy',
    eyeRow: 5,
    eyeSpread: 2,
    decorations: [
      { x: 0, y: 3, w: 3, h: 1, color: 'accentDark' },
      { x: 0, y: 4, w: 2, h: 1, color: 'accentDark' },
      { x: 13, y: 3, w: 3, h: 1, color: 'accentDark' },
      { x: 14, y: 4, w: 2, h: 1, color: 'accentDark' },
    ],
  },
  'stretch-serpent': {
    profile: [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    offsets: [0, 1, 2, 2, 1, 0, -1, -2, -2, -1, 0, 1],
    eyeStyle: 'round',
    eyeRow: 1,
    eyeSpread: 1,
    decorations: [
      { x: 11, y: 2, w: 1, h: 1, color: 'accent' },
      { x: 4, y: 7, w: 1, h: 1, color: 'accent' },
    ],
  },
  'couch-kraken': {
    profile: [1, 3, 5, 6, 7, 7, 7, 7, 6, 5, 3, 0],
    eyeStyle: 'round',
    eyeRow: 4,
    eyeSpread: 3,
    decorations: [
      { x: 3, y: 12, w: 1, h: 2, color: 'accent' },
      { x: 6, y: 13, w: 1, h: 1, color: 'accentDark' },
      { x: 9, y: 12, w: 1, h: 2, color: 'accent' },
      { x: 12, y: 13, w: 1, h: 1, color: 'accentDark' },
      { x: 6, y: 5, w: 1, h: 1, color: 'accentDark' },
      { x: 9, y: 8, w: 1, h: 1, color: 'accentDark' },
    ],
  },
  'sleepy-sloth-king': {
    profile: [1, 3, 4, 5, 5, 5, 5, 5, 4, 3, 1, 0],
    eyeStyle: 'sleepy',
    eyeRow: 5,
    eyeSpread: 2,
    decorations: [
      { x: 6, y: 0, w: 1, h: 1, color: 'accent' },
      { x: 7, y: 0, w: 2, h: 1, color: 'accentDark' },
      { x: 9, y: 0, w: 1, h: 1, color: 'accent' },
      { x: 11, y: 0, w: 2, h: 1, color: 'accentDark' },
      { x: 10, y: 1, w: 1, h: 1, color: 'accentDark' },
      { x: 11, y: 2, w: 2, h: 1, color: 'accentDark' },
    ],
  },
}

type Rect = { x: number; y: number; w: number; h: number; fill: string }

function bodyRects(def: BossArtDef, palette: Palette): Rect[] {
  const rects: Rect[] = []
  def.profile.forEach((half, i) => {
    if (half <= 0) return
    const offset = def.offsets?.[i] ?? 0
    const w = half * 2
    const x = Math.max(0, Math.min(16 - w, 8 - half + offset))
    const shaded = i >= def.profile.length - 2
    rects.push({ x, y: i, w, h: 1, fill: shaded ? palette.bodyDark : palette.body })
  })
  return rects
}

function eyeRects(def: BossArtDef): Rect[] {
  const { eyeStyle, eyeRow, eyeSpread } = def
  const left = 8 - eyeSpread - 1
  const right = 8 + eyeSpread
  if (eyeStyle === 'sleepy') {
    return [
      { x: left, y: eyeRow, w: 2, h: 1, fill: INK },
      { x: right - 1, y: eyeRow, w: 2, h: 1, fill: INK },
    ]
  }
  const eyes: Rect[] = [
    { x: left, y: eyeRow, w: 1, h: 2, fill: INK },
    { x: right, y: eyeRow, w: 1, h: 2, fill: INK },
  ]
  if (eyeStyle === 'fangy') {
    eyes.push({ x: left + 1, y: eyeRow + 2, w: 1, h: 1, fill: FANG }, { x: right - 1, y: eyeRow + 2, w: 1, h: 1, fill: FANG })
  }
  return eyes
}

function decorationRects(def: BossArtDef, palette: Palette): Rect[] {
  return (def.decorations ?? []).map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, fill: d.color === 'fang' ? FANG : palette[d.color] }))
}

const SPRITE_STYLE = `
.boss-sprite__idle { transform-origin: 50% 100%; animation: boss-idle-bob 1.8s ease-in-out infinite; }
[data-motion='reduced'] .boss-sprite__idle, [data-motion='off'] .boss-sprite__idle { animation: none; }
@media (prefers-reduced-motion: reduce) { .boss-sprite__idle { animation: none; } }
@keyframes boss-idle-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-0.4px); } }
.boss-sprite__hurt { animation: boss-hurt-shake 0.4s ease-in-out; }
[data-motion='reduced'] .boss-sprite__hurt, [data-motion='off'] .boss-sprite__hurt { animation: none; }
@media (prefers-reduced-motion: reduce) { .boss-sprite__hurt { animation: none; } }
@keyframes boss-hurt-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-0.6px); } 40% { transform: translateX(0.6px); } 60% { transform: translateX(-0.6px); } 80% { transform: translateX(0.6px); } }
.boss-sprite__flash { fill: #ffffff; opacity: 0; animation: boss-hurt-flash 0.4s ease-out; }
[data-motion='reduced'] .boss-sprite__flash, [data-motion='off'] .boss-sprite__flash { animation: boss-hurt-flash-reduced 0.4s ease-out; }
@media (prefers-reduced-motion: reduce) { .boss-sprite__flash { animation: boss-hurt-flash-reduced 0.4s ease-out; } }
@keyframes boss-hurt-flash { 0% { opacity: 0.7; } 100% { opacity: 0; } }
@keyframes boss-hurt-flash-reduced { 0% { opacity: 0.4; } 100% { opacity: 0; } }
.boss-sprite__poof-petal { opacity: 0; animation: boss-poof 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
[data-motion='reduced'] .boss-sprite__poof-petal, [data-motion='off'] .boss-sprite__poof-petal { animation: none; opacity: 1; }
@media (prefers-reduced-motion: reduce) { .boss-sprite__poof-petal { animation: none; opacity: 1; } }
@keyframes boss-poof { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
`

export type BossSpriteState = 'idle' | 'hurt' | 'defeated'

// One boss, in one of three poses. `decorative` (default) hides it from
// the accessibility tree -- the surrounding UI always carries the boss's
// name and HP as real text; this is only its portrait.
export function BossSprite({
  boss,
  state = 'idle',
  size = 96,
  decorative = true,
}: {
  boss: Boss
  state?: BossSpriteState
  size?: number
  decorative?: boolean
}) {
  if (state === 'defeated') {
    return <BossPoof size={size} decorative={decorative} label={`${boss.name}, defeated`} />
  }
  const palette = PALETTES[boss.id] ?? PALETTES['squat-slime']
  const art = ARTS[boss.id] ?? ARTS['squat-slime']
  return (
    <svg
      className={state === 'hurt' ? 'boss-sprite__hurt' : 'boss-sprite__idle'}
      viewBox="0 0 16 14"
      width={size}
      height={(size * 14) / 16}
      shapeRendering="crispEdges"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : boss.name}
    >
      <style>{SPRITE_STYLE}</style>
      {bodyRects(art, palette).map((r, i) => (
        <rect key={`b${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
      {decorationRects(art, palette).map((r, i) => (
        <rect key={`d${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
      {eyeRects(art).map((r, i) => (
        <rect key={`e${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
      {state === 'hurt' && <rect className="boss-sprite__flash" x={0} y={0} width={16} height={14} />}
    </svg>
  )
}

function Petal({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g className="boss-sprite__poof-petal" style={{ animationDelay: `${delay}s` }}>
      <rect x={x} y={y} width={2} height={2} fill={PETAL} />
      <rect x={x + 1} y={y - 1} width={1} height={1} fill={PETAL_DARK} />
    </g>
  )
}

// The defeated pose: a soft poof instead of the boss, with a few pixel
// petals drifting out -- cute, never a "beaten" face (CLAUDE.md: celebrate,
// never shame).
function BossPoof({ size, decorative, label }: { size: number; decorative: boolean; label: string }) {
  return (
    <svg
      viewBox="0 0 16 14"
      width={size}
      height={(size * 14) / 16}
      shapeRendering="crispEdges"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
    >
      <style>{SPRITE_STYLE}</style>
      <g className="boss-sprite__poof-petal">
        <rect x={5} y={6} width={6} height={4} fill="#ffffff" opacity={0.6} />
      </g>
      <Petal x={2} y={3} delay={0.05} />
      <Petal x={11} y={2} delay={0.12} />
      <Petal x={1} y={8} delay={0.18} />
      <Petal x={12} y={8} delay={0.24} />
      <Petal x={7} y={0} delay={0.3} />
    </svg>
  )
}
