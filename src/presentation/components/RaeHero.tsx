import { Link } from 'react-router-dom'
import { RaeFigure } from './Rae'
import type { DayPart } from '../greeting'

// Today's centerpiece: Rae standing in a cozy room. Everything around her
// is inline SVG/CSS, with no image assets: a window whose sky follows the
// time of day, fairy lights, a plant, a warm lamp glow and a rug. It stays
// short enough that the "Up next" card is still above the fold on a 390x844
// phone. Taps through to Meet Rae.

const SKY: Record<DayPart, [string, string]> = {
  morning: ['#bfe3ff', '#fff4d6'],
  afternoon: ['#9fd4ff', '#dff1ff'],
  evening: ['#ffb38a', '#ffd6e7'],
  night: ['#3b3a6b', '#6d5fa8'],
}

// Rae's line (raeSays) sits in a pixel speech bubble on the right wall,
// clear of her face and the window. The link's "Meet Rae" label would hide
// anything inside it, so screen readers get the line once from a sibling.
const SAYS_STYLE = `
.rae-says {
  position: absolute; right: 10px; top: 54px; max-width: 128px;
  padding: 6px 8px; background: #fffdf8; color: #3d2f4f;
  font-size: 0.8125rem; font-weight: 800; line-height: 1.25; text-align: left;
  box-shadow: 0 -2px 0 0 #4a3a5c, 0 2px 0 0 #4a3a5c, -2px 0 0 0 #4a3a5c, 2px 0 0 0 #4a3a5c, 0 6px 0 0 rgb(74 58 92 / 0.18);
  transform-origin: 0% 100%;
}
.rae-says__tail, .rae-says__tail::after { position: absolute; display: block; background: #4a3a5c; }
.rae-says__tail { left: -8px; bottom: 6px; width: 6px; height: 6px; box-shadow: inset -2px -2px 0 0 #fffdf8; }
.rae-says__tail::after { content: ''; left: -4px; bottom: -2px; width: 4px; height: 4px; }
[data-motion='full'] .rae-says { animation: rae-says-pop 0.32s steps(4, end) 0.35s both; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .rae-says { animation-delay: 0s !important; } }
@keyframes rae-says-pop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`

export function RaeHero({ part, says }: { part: DayPart; says?: string }) {
  const [skyTop, skyBottom] = SKY[part]
  const night = part === 'night'
  return (
    <>
    <Link to="/rae" aria-label="Meet Rae" className={`rae-room block rae-room--${part}`}>
      <svg
        className="rae-room__scene"
        viewBox="0 0 360 280"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden
        shapeRendering="crispEdges"
      >
        <defs>
          <linearGradient id="rae-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBottom} />
          </linearGradient>
          <radialGradient id="rae-lamp" cx="0.5" cy="0.55" r="0.5">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Window with curtains */}
        <rect x="26" y="40" width="92" height="104" fill="#fffaf2" />
        <rect x="32" y="46" width="80" height="92" fill="url(#rae-sky)" />
        {night ? (
          <>
            <circle cx="92" cy="66" r="9" fill="#fff6d8" />
            <rect x="46" y="58" width="2" height="2" fill="#fff" />
            <rect x="62" y="82" width="2" height="2" fill="#fff" />
            <rect x="98" y="100" width="2" height="2" fill="#fff" />
          </>
        ) : (
          <circle cx="90" cy={part === 'evening' ? 118 : 68} r="11" fill={part === 'evening' ? '#ffe08a' : '#fff6c9'} />
        )}
        <rect x="70" y="46" width="4" height="92" fill="#fffaf2" />
        <rect x="32" y="90" width="80" height="4" fill="#fffaf2" />
        <path d="M18 34 h24 v112 q-6 -30 -24 -40 z" fill="#f7b8cf" />
        <path d="M126 34 h-24 v112 q6 -30 24 -40 z" fill="#f7b8cf" />
        <rect x="16" y="30" width="112" height="6" rx="3" fill="#d9a3b8" />

        {/* Fairy lights */}
        <path d="M150 22 Q205 48 260 24 Q300 44 350 20" fill="none" stroke="#c9a88f" strokeWidth="1.5" />
        {[
          [162, 29],
          [184, 37],
          [206, 40],
          [228, 35],
          [250, 27],
          [272, 30],
          [296, 36],
          [320, 31],
          [342, 23],
        ].map(([x, y], i) => (
          <circle
            key={i}
            className="rae-room__bulb"
            cx={x}
            cy={y + 4}
            r="3.2"
            fill={i % 3 === 0 ? '#ffd27a' : i % 3 === 1 ? '#ffb3cf' : '#c9b8ff'}
            style={{ animationDelay: `${(i % 4) * 0.7}s` }}
          />
        ))}

        {/* Lamp glow behind Rae */}
        <ellipse cx="180" cy="150" rx="120" ry="120" fill="url(#rae-lamp)" />

        {/* Floor and rug */}
        <rect x="0" y="232" width="360" height="48" fill="#f2d3bd" />
        <rect x="0" y="232" width="360" height="3" fill="#e8bfa4" />
        <ellipse cx="180" cy="252" rx="112" ry="20" fill="#e9c6f2" />
        <ellipse cx="180" cy="252" rx="92" ry="15" fill="#f7cfe0" />
        <ellipse cx="180" cy="252" rx="70" ry="10" fill="#fde3ec" />
        {/* Contact shadow under her feet */}
        <ellipse cx="180" cy="254" rx="30" ry="5" fill="#b48aa6" opacity="0.45" />

        {/* Plant */}
        <ellipse cx="316" cy="196" rx="12" ry="22" fill="#7cc49a" transform="rotate(-24 316 196)" />
        <ellipse cx="334" cy="192" rx="11" ry="24" fill="#8fd4a8" transform="rotate(18 334 192)" />
        <ellipse cx="326" cy="184" rx="9" ry="26" fill="#6db88c" />
        <rect x="308" y="210" width="36" height="30" rx="4" fill="#e59a7a" />
        <rect x="306" y="208" width="40" height="6" rx="3" fill="#d4866a" />
      </svg>

      <span className="rae-room__figure">
        <RaeFigure view="front" height={250} />
      </span>

      {says && (
        <span className="rae-says" aria-hidden data-testid="rae-says">
          <style>{SAYS_STYLE}</style>
          {says}
          <span className="rae-says__tail" />
        </span>
      )}
    </Link>
    {says && <p className="sr-only">Rae says: {says}</p>}
    </>
  )
}
