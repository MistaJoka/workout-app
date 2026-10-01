// "Afterglow": on a day a workout was finished (afterglow.ts's
// isAfterglowDay, derived from RaeHero's own `flowers` prop), Rae's room on
// Today stays warm and celebratory a little longer. Everything here layers
// into the same 360x280 scene as RaeHero's window/plant/rug, seasonDecor.tsx
// and roomGrowthDecor.tsx - purely decorative (aria-hidden, pointer-events
// none), and kept clear of Rae's face, the speech bubble, the garden pots
// and the Meet Rae corner button:
//  - a warm glow pooling in the room's bottom-left corner, behind the rug
//    and pots, well short of Rae's face (x > ~140) or the bubble (x > 220)
//  - the fairy-light bulbs twinkle a little brighter (a CSS rule keyed off
//    the room wrapper's own `rae-room--afterglow` class, not a new shape)
//  - three small sparkles floating in the room's two clear side pockets
//    beside Rae (left of her and between her and the plant/bookshelf),
//    never above her shoulders or inside the bubble/pots zones
//  - a soft halo behind the newest garden pot (the newest-pot `<span>`
//    already exists in RaeHero.tsx; the halo is a sibling drawn behind it,
//    not a change to the flower art itself)
//
// Full motion: the glow and sparkles breathe on slow, gentle loops. Reduced
// motion: everything is simply, statically there - no animation. Off: same
// static placement. Nothing here carries information motion could remove.

import type { CSSProperties } from 'react'

export const AFTERGLOW_DECOR_STYLE = `
.rae-afterglow-glow { opacity: 0.55; }
[data-motion='full'] .rae-afterglow-glow { animation: rae-afterglow-pulse 6s ease-in-out infinite both; }
@keyframes rae-afterglow-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.68; } }
:root[data-motion='reduced'] .rae-afterglow-glow, :root[data-motion='off'] .rae-afterglow-glow { opacity: 0.55; animation: none; }

.rae-afterglow-sparkle { opacity: 0.75; }
[data-motion='full'] .rae-afterglow-sparkle {
  animation: rae-afterglow-float 4.6s ease-in-out infinite both;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes rae-afterglow-float {
  0%, 100% { opacity: 0.45; transform: translateY(0) scale(0.9); }
  50% { opacity: 0.95; transform: translateY(-5px) scale(1.1); }
}
:root[data-motion='reduced'] .rae-afterglow-sparkle, :root[data-motion='off'] .rae-afterglow-sparkle { opacity: 0.75; animation: none; }

/* Fairy-light bulbs read a touch brighter/bigger while the room is aglow -
   the bulbs themselves are unchanged; this just nudges their existing
   twinkle (index.css's rae-twinkle keyframe stays as-is). */
.rae-room--afterglow .rae-room__bulb { filter: brightness(1.18) saturate(1.1); }
[data-motion='full'] .rae-room--afterglow .rae-room__bulb { animation-duration: 2.1s; }

/* A soft halo sitting behind the newest pot's flower, in the overlay layer
   (not the SVG), sized a little larger than the 24px pot it backs. */
.rae-pots__halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 211 122 / 0.75) 0%, rgb(255 211 122 / 0) 72%);
  z-index: -1;
  pointer-events: none;
}
[data-motion='full'] .rae-pots__halo { animation: rae-afterglow-pulse 5s ease-in-out infinite both; }
:root[data-motion='reduced'] .rae-pots__halo, :root[data-motion='off'] .rae-pots__halo { animation: none; }
`

// Three gentle sparkles in the room's clear side pockets beside Rae: left
// of her (clear of the window, which ends at y=144) and in the gap toward
// the plant/bookshelf on the right (clear of the speech bubble, whose box
// bottoms out well above y=170, and the bookshelf at y<=150).
const SPARKLES: ReadonlyArray<{ x: number; y: number; size: number; delay: number }> = [
  { x: 96, y: 168, size: 3, delay: 0 },
  { x: 118, y: 198, size: 2, delay: 1.3 },
  { x: 244, y: 188, size: 3, delay: 2.4 },
]

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <g
      className="rae-afterglow-sparkle"
      style={{ animationDelay: `${delay}s` } as CSSProperties}
    >
      <rect x={x} y={y} width={size} height={size} fill="#fff3c4" />
      <rect x={x - size} y={y + size / 2 - 0.5} width={size} height={1} fill="#fff3c4" opacity="0.7" />
      <rect x={x + size} y={y + size / 2 - 0.5} width={size} height={1} fill="#fff3c4" opacity="0.7" />
    </g>
  )
}

// The full afterglow layer, rendered as children of RaeHero's existing
// `<svg>` scene so it shares its viewBox/crispEdges. `glowId` names the
// radial gradient defined alongside it.
export function AfterglowDecor() {
  return (
    <>
      <defs>
        <radialGradient id="rae-afterglow-corner" cx="0.15" cy="0.95" r="0.55">
          <stop offset="0" stopColor="#ffd37a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd37a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g data-testid="rae-afterglow-decor" aria-hidden="true" style={{ pointerEvents: 'none' } as CSSProperties}>
        <ellipse className="rae-afterglow-glow" cx="40" cy="266" rx="130" ry="100" fill="url(#rae-afterglow-corner)" />
        {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}
      </g>
    </>
  )
}
