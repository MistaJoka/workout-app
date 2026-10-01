// The flower a finished workout grows in this week's windowsill, drawn on
// the same 16px pixel grid and palette as WeekBlooms' pots, but big and
// growing on the Complete screen: the stem rises, the leaves unfold, the
// petals pop open, then a few pixel sparkles. Every piece animates with
// `both` fill, so when motion is reduced or off (index.css clamps every
// animation to ~0ms) the finished flower is simply there; the sparkles are
// decoration and may vanish. The clamp shortens durations but not delays,
// so delays are zeroed here too, or the petals would wait unseen. `bloomed=false` shows the pot with its sprout
// while the result is still loading.

const PETAL = '#ff8fb8'
const PETAL_DARK = '#f06a9e'
const LEAF = '#5bbf8a'
const LEAF_DARK = '#3f9d6e'
const CENTER = '#ffe08a'
const CENTER_DARK = '#f5b942'
const SPARKLE = '#ffc58a'

const STYLE = `
.pixel-bloom * { transform-box: fill-box; }
.pixel-bloom__stem { transform-origin: 50% 100%; animation: pixel-bloom-rise 0.45s steps(5, end) 0.25s both; }
.pixel-bloom__leaf-l { transform-origin: 100% 50%; animation: pixel-bloom-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3) 0.65s both; }
.pixel-bloom__leaf-r { transform-origin: 0% 50%; animation: pixel-bloom-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3) 0.75s both; }
.pixel-bloom__head { transform-origin: 50% 100%; animation: pixel-bloom-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.35) 0.95s both; }
.pixel-bloom__sparkle { opacity: 0; animation: pixel-bloom-twinkle 1.2s ease-out both; }
[data-motion='reduced'] .pixel-bloom *, [data-motion='off'] .pixel-bloom * { animation-delay: 0s !important; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .pixel-bloom * { animation-delay: 0s !important; } }
@keyframes pixel-bloom-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes pixel-bloom-pop { from { transform: scale(0); } to { transform: scale(1); } }
@keyframes pixel-bloom-twinkle { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
`

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g className="pixel-bloom__sparkle" style={{ animationDelay: `${delay}s` }}>
      <rect x={x} y={y - 1} width="1" height="3" fill={SPARKLE} />
      <rect x={x - 1} y={y} width="3" height="1" fill={SPARKLE} />
    </g>
  )
}

export function PixelBloom({ bloomed = true, size = 120, label }: { bloomed?: boolean; size?: number; label?: string }) {
  return (
    <svg
      className="pixel-bloom"
      viewBox="0 0 16 22"
      width={size}
      height={(size * 22) / 16}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label ?? (bloomed ? 'A flower in bloom' : 'A sprout in a pot')}
    >
      <style>{STYLE}</style>
      {bloomed ? (
        <>
          <rect className="pixel-bloom__stem" x="7" y="7" width="2" height="9" fill={LEAF_DARK} />
          <g className="pixel-bloom__leaf-l">
            <rect x="3" y="11" width="4" height="2" fill={LEAF} />
            <rect x="4" y="10" width="2" height="1" fill={LEAF} />
          </g>
          <g className="pixel-bloom__leaf-r">
            <rect x="9" y="9" width="4" height="2" fill={LEAF} />
            <rect x="10" y="11" width="2" height="1" fill={LEAF} />
          </g>
          <g className="pixel-bloom__head">
            <rect x="6" y="0" width="4" height="2" fill={PETAL} />
            <rect x="4" y="2" width="2" height="4" fill={PETAL} />
            <rect x="10" y="2" width="2" height="4" fill={PETAL} />
            <rect x="6" y="6" width="4" height="1" fill={PETAL} />
            <rect x="5" y="1" width="1" height="1" fill={PETAL_DARK} />
            <rect x="10" y="1" width="1" height="1" fill={PETAL_DARK} />
            <rect x="5" y="6" width="1" height="1" fill={PETAL_DARK} />
            <rect x="10" y="6" width="1" height="1" fill={PETAL_DARK} />
            <rect x="6" y="2" width="4" height="4" fill={CENTER} />
            <rect x="7" y="3" width="2" height="2" fill={CENTER_DARK} />
          </g>
          <Sparkle x={2} y={3} delay={1.25} />
          <Sparkle x={13} y={1} delay={1.4} />
          <Sparkle x={14} y={8} delay={1.55} />
        </>
      ) : (
        <>
          <rect x="7" y="12" width="2" height="4" fill={LEAF_DARK} />
          <rect x="4" y="11" width="3" height="2" fill={LEAF} />
          <rect x="9" y="10" width="3" height="2" fill={LEAF} />
        </>
      )}
      {/* The pot, same shape and clay colors as WeekBlooms'. */}
      <rect x="2" y="16" width="12" height="2" fill="#d4866a" />
      <rect x="3" y="16" width="10" height="1" fill="#8a5a44" />
      <rect x="3" y="18" width="10" height="3" fill="#e0906a" />
      <rect x="4" y="21" width="8" height="1" fill="#c9785d" />
    </svg>
  )
}
