// Rae's room grows with the user's Bloom level (roomUnlocks.ts): small,
// permanent pixel-art decorations that layer into the same 360x280 scene as
// RaeHero's window/plant/rug and seasonDecor.tsx's seasonal touches.
//
// Every piece lives in its own small patch of wall or floor, picked to stay
// clear of Rae's face/figure, the speech bubble, the garden pots, the
// seasonal decor's key pieces (the rug gap and window sill/corners) and the
// Meet Rae corner button - see the margins noted on each piece below.
// Because unlocks are never lost, all seven can be on screen at once by the
// highest level, so their patches must also stay clear of each other.
//
// `lightsUpgrade` and `rugPattern` don't add new shapes in new places:
// they warm the existing fairy-light bulbs and dust the existing rug with a
// pattern, so they carry no extra placement risk.

import type { CSSProperties, ReactElement } from 'react'
import type { RoomUnlockItem } from '../roomUnlocks'

export const ROOM_GROWTH_STYLE = `
.rae-unlock-new { opacity: 0; }
[data-motion='full'] .rae-unlock-new { animation: rae-unlock-twinkle 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
:root[data-motion='reduced'] .rae-unlock-new { animation: rae-unlock-fade 220ms ease-out both; }
:root[data-motion='off'] .rae-unlock-new { opacity: 1; animation: none; }
@keyframes rae-unlock-twinkle {
  0% { opacity: 0; transform: scale(0.4); }
  55% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes rae-unlock-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rae-unlock-new { animation: rae-unlock-fade 220ms ease-out both !important; } }
`

// A tiny framed flower painting on the wall above the window (L2).
function WallFrame() {
  return (
    <g>
      <rect x="56" y="4" width="22" height="16" fill="#8a6a52" />
      <rect x="58" y="6" width="18" height="12" fill="#fffaf2" />
      <rect x="63" y="10" width="3" height="3" fill="#ff8fb8" />
      <rect x="68" y="12" width="3" height="3" fill="#ffd27a" />
      <rect x="65" y="14" width="2" height="3" fill="#6db88c" />
    </g>
  )
}

// A small floor cushion on the rug, in the narrow gap between the garden
// pots and Rae's feet - positioned against the room's real measured
// geometry (figure/pots/bubble bounding boxes), not guessed (L3).
function Cushion() {
  return (
    <g>
      <rect x="120" y="251" width="20" height="14" rx="3" fill="#c9b8ff" />
      <rect x="120" y="251" width="20" height="4" fill="#dcd0ff" />
      <rect x="124" y="257" width="4" height="4" fill="#a893f0" opacity="0.6" />
      <rect x="132" y="257" width="4" height="4" fill="#a893f0" opacity="0.6" />
    </g>
  )
}

// A small bookshelf on the right wall, between the speech bubble and the
// plant (L5): two shelves of standing book spines in a frame, so it reads
// as a bookshelf rather than a drawer front.
function Bookshelf() {
  // Each spine's top y; it stands on the shelf line below it (134-140 for
  // the top shelf, 141-148 for the bottom one), so height is the gap.
  const TOP_SHELF_BOTTOM = 140
  const BOTTOM_SHELF_BOTTOM = 148
  const topSpines: Array<[number, number, string]> = [
    [229, 135, '#ff8fb8'],
    [233, 134, '#9ee6c4'],
    [237, 136, '#ffd27a'],
    [241, 135, '#c9b8ff'],
    [245, 134, '#ffb3cf'],
    [249, 136, '#8fd4a8'],
    [253, 135, '#ffd27a'],
  ]
  const bottomSpines: Array<[number, number, string]> = [
    [229, 143, '#c9b8ff'],
    [235, 142, '#ffb3cf'],
    [241, 144, '#9ee6c4'],
    [247, 143, '#ffd27a'],
    [253, 142, '#8fd4a8'],
  ]
  return (
    <g>
      <rect x="226" y="132" width="34" height="18" fill="#8a6a52" />
      <rect x="228" y="134" width="30" height="6" fill="#fffaf2" />
      <rect x="228" y="141" width="30" height="7" fill="#fffaf2" />
      <rect x="228" y="140" width="30" height="1" fill="#8a6a52" />
      {topSpines.map(([x, topY, color]) => (
        <rect key={`t${x}`} x={x} y={topY} width="3" height={TOP_SHELF_BOTTOM - topY} fill={color} />
      ))}
      {bottomSpines.map(([x, topY, color]) => (
        <rect key={`b${x}`} x={x} y={topY} width="3" height={BOTTOM_SHELF_BOTTOM - topY} fill={color} />
      ))}
    </g>
  )
}

// A hanging vine with a tiny pot, from the ceiling above the window's left
// edge (L12).
function HangingPlant() {
  return (
    <g>
      <rect x="26" y="0" width="10" height="3" fill="#8a6a52" />
      <rect x="29" y="3" width="4" height="10" fill="#c9a88f" />
      <rect x="23" y="13" width="16" height="9" rx="2" fill="#e59a7a" />
      <rect x="25" y="20" width="3" height="6" fill="#6db88c" />
      <rect x="31" y="21" width="3" height="7" fill="#7cc49a" />
      <rect x="35" y="19" width="3" height="5" fill="#8fd4a8" />
    </g>
  )
}

// A cushioned bench under the window, the biggest unlock (L15).
function WindowSeat() {
  return (
    <g>
      <rect x="22" y="160" width="100" height="14" rx="3" fill="#f7cfe0" />
      <rect x="22" y="174" width="100" height="36" fill="#e59a7a" />
      <rect x="22" y="174" width="100" height="5" fill="#f0ab86" />
      <rect x="26" y="210" width="8" height="18" fill="#8a6a52" />
      <rect x="110" y="210" width="8" height="18" fill="#8a6a52" />
      <rect x="34" y="164" width="12" height="7" rx="2" fill="#fffaf2" />
      <rect x="98" y="164" width="12" height="7" rx="2" fill="#fffaf2" />
    </g>
  )
}

// A scatter of small dots dusted across the rug's otherwise-empty strip
// between the window seat and the garden pots - the rug's own colors, a
// pattern rather than a new object, so it never competes with Rae, her
// pots or the seasonal decor's rug-gap pieces (L9).
function RugPattern() {
  const dots: Array<[number, number, string]> = [
    [44, 234, '#c98fb0'],
    [60, 239, '#e0a8c8'],
    [76, 233, '#c98fb0'],
    [92, 240, '#e0a8c8'],
    [106, 235, '#c98fb0'],
  ]
  return (
    <g opacity="0.55">
      {dots.map(([x, y, color], i) => (
        <rect key={i} x={x} y={y} width="3" height="3" fill={color} />
      ))}
    </g>
  )
}

const WARM_BULB_COLORS = ['#ffd27a', '#ffb866', '#ffcf9e']

// The fairy-light bulb colors: the room's usual playful multicolor string,
// or a warmer amber set once `lightsUpgrade` is earned (L7) - the same
// bulbs, just cozier.
export function bulbColor(i: number, warm: boolean): string {
  if (warm) return WARM_BULB_COLORS[i % WARM_BULB_COLORS.length]
  return i % 3 === 0 ? '#ffd27a' : i % 3 === 1 ? '#ffb3cf' : '#c9b8ff'
}

const PIECES: Record<Exclude<RoomUnlockItem, 'lightsUpgrade' | 'rugPattern'>, () => ReactElement> = {
  wallFrame: WallFrame,
  cushion: Cushion,
  bookshelf: Bookshelf,
  hangingPlant: HangingPlant,
  windowSeat: WindowSeat,
}

// The full growth layer: every item the room has earned so far, each drawn
// once and kept forever. `newest` (when `reveal` is true) gets the
// twinkle-in treatment; everything else is simply, quietly there.
export function RoomGrowthDecor({
  items,
  newest,
  reveal,
}: {
  items: readonly RoomUnlockItem[]
  newest: RoomUnlockItem | null
  reveal: boolean
}) {
  return (
    <g data-testid="rae-room-growth">
      {items.includes('rugPattern') && (
        <g className={reveal && newest === 'rugPattern' ? 'rae-unlock-new' : ''} data-testid="rae-room-unlock-rugPattern">
          <RugPattern />
        </g>
      )}
      {(Object.keys(PIECES) as (keyof typeof PIECES)[])
        .filter((item) => items.includes(item))
        .map((item) => {
          const Piece = PIECES[item]
          const isNewest = reveal && newest === item
          return (
            <g
              key={item}
              className={isNewest ? 'rae-unlock-new' : ''}
              data-testid={`rae-room-unlock-${item}`}
              style={isNewest ? ({ transformOrigin: 'center', transformBox: 'fill-box' } as CSSProperties) : undefined}
            >
              <Piece />
            </g>
          )
        })}
    </g>
  )
}
