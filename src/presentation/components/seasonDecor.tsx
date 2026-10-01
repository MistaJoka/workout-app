// Small inline-SVG decorations that make Rae's room on Today feel like the
// current season, layered into the same crisp-pixel scene as RaeHero's
// window/plant/rug (see season.ts for the pure date logic). Everything
// here lives in the room's own 360x280 viewBox, clear of Rae's face, the
// speech bubble, the garden pots and the Meet Rae corner button:
//  - window interior (clipped to the glass): falling/drifting particles
//  - window sill/frame: a static seasonal touch (sprig, frost, glint)
//  - the rug gap between Rae and the plant (~x220-300): a small static
//    prop (pumpkin, lemonade glass)
//  - the curtain rod: a holiday accent only, never the everyday look
//
// Falling/drifting particles use a fade-in/drift/fade-out loop (so the
// loop restart happens while invisible, no visible jump) and only animate
// under full motion - index.css's global reduced/off clamp already forces
// every animation here to ~0s/1 iteration, but each particle also gets an
// explicit static (no-animation) class so its resting frame is a deliberate
// position, not whatever the keyframe's last tick happens to be.

import type { CSSProperties } from 'react'
import type { HolidayAccent, Season } from '../season'

const WINDOW_CLIP_ID = 'rae-season-window-clip'

export const SEASON_DECOR_STYLE = `
.rae-season-particle { opacity: 0; }
[data-motion='full'] .rae-season-particle { animation: rae-season-drift 5s ease-in-out infinite both; }
@keyframes rae-season-drift {
  0% { opacity: 0; transform: translate(0, 0); }
  12% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--season-dx, 0), var(--season-dy, 14px)); }
}
/* Static placement: no drift, just quietly there. */
[data-motion='reduced'] .rae-season-particle, [data-motion='off'] .rae-season-particle { opacity: 0.85; animation: none; }

.rae-season-lights__bulb { opacity: 0.65; }
[data-motion='full'] .rae-season-lights__bulb { animation: rae-season-glow 3.2s ease-in-out infinite both; }
@keyframes rae-season-glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
[data-motion='reduced'] .rae-season-lights__bulb, [data-motion='off'] .rae-season-lights__bulb { opacity: 0.85; animation: none; }

.rae-season-glint { opacity: 0.75; }
[data-motion='full'] .rae-season-glint { animation: rae-season-glow 2.4s ease-in-out infinite both; }
[data-motion='reduced'] .rae-season-glint, [data-motion='off'] .rae-season-glint { opacity: 1; animation: none; }
`

type Particle = { x: number; y: number; size: number; color: string; dx: number; dy: number; delay: number }

function Particles({ items, shape }: { items: readonly Particle[]; shape: 'leaf' | 'flake' | 'petal' }) {
  return (
    <g clipPath={`url(#${WINDOW_CLIP_ID})`}>
      {items.map((p, i) => (
        <g
          key={i}
          className="rae-season-particle"
          style={
            {
              animationDelay: `${p.delay}s`,
              '--season-dx': `${p.dx}px`,
              '--season-dy': `${p.dy}px`,
            } as CSSProperties
          }
        >
          {shape === 'flake' && (
            <>
              <rect x={p.x} y={p.y} width={p.size} height={p.size} fill={p.color} />
              <rect x={p.x - 1} y={p.y + 1} width={1} height={1} fill={p.color} />
              <rect x={p.x + p.size} y={p.y + 1} width={1} height={1} fill={p.color} />
            </>
          )}
          {shape === 'leaf' && (
            <>
              <rect x={p.x} y={p.y} width={p.size} height={p.size - 1} fill={p.color} />
              <rect x={p.x + p.size - 1} y={p.y + p.size - 1} width={2} height={2} fill={p.color} />
            </>
          )}
          {shape === 'petal' && (
            <>
              <rect x={p.x} y={p.y} width={p.size} height={p.size} fill={p.color} />
              <rect x={p.x - 2} y={p.y + 1} width={2} height={1} fill={p.color} />
              <rect x={p.x + p.size} y={p.y + p.size - 1} width={2} height={1} fill={p.color} />
            </>
          )}
        </g>
      ))}
    </g>
  )
}

// Autumn: a few leaves drifting down past the window glass, orange/gold
// tones pulled from the room's own plant-pot palette.
const AUTUMN_LEAVES: readonly Particle[] = [
  { x: 40, y: 52, size: 5, color: '#e59a7a', dx: -6, dy: 20, delay: 0 },
  { x: 84, y: 58, size: 4, color: '#ffd27a', dx: 5, dy: 22, delay: 1.1 },
  { x: 56, y: 46, size: 4, color: '#d4866a', dx: -4, dy: 18, delay: 2.3 },
  { x: 96, y: 72, size: 5, color: '#e59a7a', dx: 6, dy: 24, delay: 0.7 },
]

// Winter: soft snow drifting inside the window glass.
const WINTER_SNOW: readonly Particle[] = [
  { x: 38, y: 50, size: 3, color: '#ffffff', dx: 2, dy: 18, delay: 0 },
  { x: 88, y: 54, size: 2, color: '#dff1ff', dx: -2, dy: 20, delay: 1.4 },
  { x: 60, y: 60, size: 3, color: '#ffffff', dx: 3, dy: 17, delay: 2.6 },
  { x: 98, y: 46, size: 2, color: '#dff1ff', dx: -3, dy: 19, delay: 0.9 },
  { x: 48, y: 70, size: 2, color: '#ffffff', dx: 2, dy: 16, delay: 2.0 },
]

// Spring: blossom petals drifting sideways through the window.
const SPRING_PETALS: readonly Particle[] = [
  { x: 42, y: 56, size: 4, color: '#ffb3cf', dx: 12, dy: 10, delay: 0 },
  { x: 90, y: 50, size: 4, color: '#fffaf2', dx: 10, dy: 12, delay: 1.3 },
  { x: 64, y: 68, size: 4, color: '#f7cfe0', dx: 13, dy: 9, delay: 2.5 },
  { x: 52, y: 80, size: 3, color: '#ffb3cf', dx: 9, dy: 11, delay: 0.6 },
]

function AutumnPumpkin() {
  // A small pumpkin sitting on the rug beside the plant pot, never
  // touching Rae's footprint (x < ~220) or the plant/Meet Rae button
  // (x > ~300).
  return (
    <g>
      {/* Stem */}
      <rect x="257" y="201" width="4" height="5" rx="1" fill="#6db88c" />
      {/* Rounded pumpkin body, built from stacked rows so it reads round,
          not boxy. */}
      <rect x="251" y="206" width="16" height="4" rx="2" fill="#f0923a" />
      <rect x="247" y="209" width="24" height="6" rx="2" fill="#f0923a" />
      <rect x="246" y="214" width="26" height="7" rx="2" fill="#f0923a" />
      <rect x="248" y="220" width="22" height="5" rx="2" fill="#f0923a" />
      {/* Ridges */}
      <rect x="258" y="207" width="1" height="17" fill="#d9722a" opacity="0.6" />
      <rect x="263" y="208" width="1" height="15" fill="#d9722a" opacity="0.6" />
      <rect x="253" y="208" width="1" height="15" fill="#d9722a" opacity="0.6" />
      {/* Round highlight for a touch of volume */}
      <rect x="250" y="211" width="4" height="4" rx="1" fill="#f6b56a" opacity="0.8" />
    </g>
  )
}

function SummerCooler() {
  // A small lemonade glass in the same rug gap, for the season with no
  // holiday accent of its own.
  return (
    <g>
      <rect x="250" y="206" width="2" height="8" fill="#ff8fb8" />
      <rect x="247" y="210" width="20" height="20" fill="#dff1ff" opacity="0.8" />
      <rect x="247" y="210" width="20" height="3" fill="#ffffff" opacity="0.9" />
      <rect x="250" y="216" width="14" height="10" fill="#ffd27a" />
      <rect x="251" y="213" width="3" height="3" fill="#ffffff" />
      <rect x="260" y="219" width="3" height="3" fill="#ffffff" />
    </g>
  )
}

function WindowSprig() {
  // A little spring sprig resting on the window's lower sill, clear of
  // the glass panes above it.
  return (
    <g>
      <rect x="68" y="140" width="2" height="6" fill="#6db88c" />
      <rect x="60" y="136" width="5" height="3" fill="#8fd4a8" />
      <rect x="74" y="134" width="5" height="3" fill="#8fd4a8" />
      <rect x="66" y="132" width="3" height="3" fill="#ff8fb8" />
      <rect x="72" y="130" width="2" height="2" fill="#ffb3cf" />
    </g>
  )
}

// One corner's frost: an L of pixels hugging the glass edge, thinning out
// toward the center. `flip` mirrors it for the window's right side, where
// the L should open toward the left instead of the right.
function FrostCorner({ x, y, flip }: { x: number; y: number; flip: boolean }) {
  const s = flip ? -1 : 1
  return (
    <g fill="#eaf6ff" opacity={0.9}>
      <rect x={flip ? x - 6 : x} y={y} width={6} height={1} />
      <rect x={x} y={y} width={1} height={6} />
      <rect x={x + 2 * s} y={y + 2} width={1} height={1} />
      <rect x={x + 1 * s} y={y + 3} width={1} height={1} />
    </g>
  )
}

function WindowFrost() {
  // Pale frost in the window's two top inner corners - static, no motion.
  return (
    <>
      <FrostCorner x={33} y={47} flip={false} />
      <FrostCorner x={110} y={47} flip={true} />
    </>
  )
}

function SunGlint({ cx, cy }: { cx: number; cy: number }) {
  const rays: Array<[number, number]> = [
    [cx - 16, cy - 2],
    [cx + 14, cy + 4],
    [cx - 4, cy - 15],
  ]
  return (
    <g className="rae-season-glint" fill="#fff6c9">
      {rays.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y - 1} width={1} height={3} />
          <rect x={x - 1} y={y} width={3} height={1} />
        </g>
      ))}
    </g>
  )
}

function WarmLights() {
  // A short string of warm bulbs draped from the window's curtain rod -
  // deliberately plain/amber, distinct from the room's everyday multicolor
  // fairy lights up on the wall. A gentle, neutral holiday touch.
  const bulbs = [30, 46, 62, 78, 94, 110]
  return (
    <g>
      <path d="M24 38 Q76 48 120 38" fill="none" stroke="#c9a88f" strokeWidth="1" />
      {bulbs.map((x, i) => (
        <rect
          key={x}
          className="rae-season-lights__bulb"
          x={x}
          y={41 + (i % 2)}
          width="3"
          height="3"
          fill="#ffd27a"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </g>
  )
}

// The full seasonal layer for Rae's room scene. Rendered as children of
// RaeHero's existing `<svg>` so it shares its viewBox/crispEdges; `sunCx`/
// `sunCy` locate the already-drawn sun circle for the summer glint (there
// is nothing to glint off the moon at night).
export function SeasonRoomDecor({
  season,
  accent,
  showSunGlint,
  sunCx,
  sunCy,
}: {
  season: Season
  accent: HolidayAccent | null
  showSunGlint: boolean
  sunCx: number
  sunCy: number
}) {
  return (
    <>
      <defs>
        <clipPath id={WINDOW_CLIP_ID}>
          <rect x="32" y="46" width="80" height="92" />
        </clipPath>
      </defs>

      <g data-testid="rae-season-decor" data-season={season} data-accent={accent ?? ''}>
        {season === 'autumn' && <Particles items={AUTUMN_LEAVES} shape="leaf" />}
        {season === 'winter' && <Particles items={WINTER_SNOW} shape="flake" />}
        {season === 'spring' && <Particles items={SPRING_PETALS} shape="petal" />}

        {season === 'winter' && <WindowFrost />}
        {season === 'spring' && <WindowSprig />}
        {season === 'summer' && showSunGlint && <SunGlint cx={sunCx} cy={sunCy} />}

        {season === 'autumn' && accent === 'pumpkin' && <AutumnPumpkin />}
        {season === 'summer' && <SummerCooler />}
        {season === 'winter' && accent === 'lights' && <WarmLights />}
      </g>
    </>
  )
}
