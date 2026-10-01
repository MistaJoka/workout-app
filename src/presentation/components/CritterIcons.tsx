// Tiny pixel-art critters, drawn on the same crisp-edge grid as PixelBloom,
// for the garden meadow and the Complete screen's bloom reveal. These are
// plain SVG pieces with no animation of their own -- each caller drives its
// own motion (an ambient drift in the meadow, or a one-shot flight-and-land
// on Complete) with its own component-scoped <style>, per CLAUDE.md.
//
// A butterfly/bee's wings are drawn as two groups, "open" and "closed":
// callers toggle which is visible (opacity) to get a cheap, deliberate
// 2-frame flap instead of a smooth tween.

const WING_LIGHT = '#c9a7ff'
const WING_DARK = '#9ccaff'
const WING_EDGE = '#6f6aa8'
const WING_PALE = '#f4f1ff'
const BODY_DARK = '#3a2b1a'
const BEE_GOLD = '#ffd966'
const BEE_GOLD_DARK = '#f2b829'
const LADYBUG_RED = '#ff6b6b'
const LADYBUG_RED_DARK = '#e0404a'
const LEAF = '#5bbf8a'
const LEAF_DARK = '#3f9d6e'

export function ButterflyIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 10 8" width={size} height={(size * 8) / 10} shapeRendering="crispEdges" aria-hidden>
      <g className="critter__wings-open">
        <rect x="0" y="1" width="3" height="3" fill={WING_LIGHT} />
        <rect x="7" y="1" width="3" height="3" fill={WING_DARK} />
        <rect x="1" y="4" width="2" height="2" fill={WING_LIGHT} />
        <rect x="7" y="4" width="2" height="2" fill={WING_DARK} />
        <rect x="0" y="1" width="1" height="1" fill={WING_EDGE} />
        <rect x="9" y="1" width="1" height="1" fill={WING_EDGE} />
      </g>
      <g className="critter__wings-closed">
        <rect x="3" y="1" width="1" height="4" fill={WING_PALE} />
        <rect x="6" y="1" width="1" height="4" fill={WING_PALE} />
      </g>
      <rect x="4" y="1" width="2" height="5" fill={BODY_DARK} />
    </svg>
  )
}

export function BeeIcon({ size = 9 }: { size?: number }) {
  return (
    <svg viewBox="0 0 9 7" width={size} height={(size * 7) / 9} shapeRendering="crispEdges" aria-hidden>
      <g className="critter__wings-open" fill={WING_PALE}>
        <rect x="2" y="0" width="2" height="2" />
        <rect x="5" y="0" width="2" height="2" />
      </g>
      <g className="critter__wings-closed" fill={WING_PALE}>
        <rect x="3" y="0" width="1" height="2" />
        <rect x="5" y="0" width="1" height="2" />
      </g>
      <rect x="2" y="2" width="5" height="4" fill={BEE_GOLD} />
      <rect x="2" y="2" width="1" height="4" fill={BODY_DARK} />
      <rect x="4" y="2" width="1" height="4" fill={BODY_DARK} />
      <rect x="6" y="2" width="1" height="4" fill={BODY_DARK} />
      <rect x="2" y="2" width="5" height="1" fill={BODY_DARK} />
      <rect x="2" y="5" width="5" height="1" fill={BEE_GOLD_DARK} />
    </svg>
  )
}

export function LadybugIcon({ size = 7 }: { size?: number }) {
  return (
    <svg viewBox="0 0 7 6" width={size} height={(size * 6) / 7} shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="1" width="5" height="4" fill={LADYBUG_RED} />
      <rect x="1" y="1" width="5" height="1" fill={BODY_DARK} />
      <rect x="3" y="1" width="1" height="4" fill={BODY_DARK} />
      <rect x="2" y="2" width="1" height="1" fill={LADYBUG_RED_DARK} />
      <rect x="5" y="3" width="1" height="1" fill={LADYBUG_RED_DARK} />
      <rect x="0" y="0" width="1" height="1" fill={BODY_DARK} />
    </svg>
  )
}

// A tiny stem the ladybug crawls on, drawn separately (crispEdges, same
// palette as PixelBloom's leaves) so it reads as its own small decoration
// rather than a real flower.
export function CritterStem({ height = 18 }: { height?: number }) {
  return (
    <svg viewBox="0 0 3 16" width="6" height={height} shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="1" height="16" fill={LEAF_DARK} />
      <rect x="0" y="4" width="1" height="2" fill={LEAF} />
      <rect x="2" y="9" width="1" height="2" fill={LEAF} />
    </svg>
  )
}
