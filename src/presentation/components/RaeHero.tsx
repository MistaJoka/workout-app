import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { RaeExerciseLoop, RaeFigure } from './Rae'
import type { RaeLoop } from './raeLoops'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'
import { useTheme } from '../theme/ThemeContext'
import { PixelBloom } from './PixelBloom'
import type { DayPart } from '../greeting'
import type { GardenFlower } from '../../domain/progress/garden'
import { gardenSeenKey, newestFlowers, pickTapLine, RAE_TAP_LINES, shouldRevealNewestFlower } from './raeRoom'
import { resolveHolidayAccent, resolveSeason } from '../season'
import { SeasonRoomDecor, SEASON_DECOR_STYLE } from './seasonDecor'
import {
  newestUnlock,
  resolveRoomLevel,
  roomUnlocksSeenKey,
  shouldRevealNewestUnlock,
  unlockedRoomItems,
} from '../roomUnlocks'
import { RoomGrowthDecor, ROOM_GROWTH_STYLE, bulbColor } from './roomGrowthDecor'
import { isAfterglowDay } from '../afterglow'
import { AfterglowDecor, AFTERGLOW_DECOR_STYLE } from './afterglowDecor'

// Today's centerpiece: Rae standing in a cozy room. Everything around her
// is inline SVG/CSS, with no image assets: a window whose sky follows the
// time of day, fairy lights, a plant, a warm lamp glow and a rug - plus a
// windowsill-level row of the newest flowers grown in the user's garden.
// It stays short enough that the "Up next" card is still above the fold on
// a 390x844 phone.
//
// Tapping Rae says hi (a hop + a random cheerful line + a petal puff); a
// small "Meet Rae" button in the corner still opens her full page.

const SKY: Record<DayPart, [string, string]> = {
  morning: ['#bfe3ff', '#fff4d6'],
  afternoon: ['#9fd4ff', '#dff1ff'],
  evening: ['#ffb38a', '#ffd6e7'],
  night: ['#3b3a6b', '#6d5fa8'],
}

const MAX_POTS = 4
// How long a tap's line stays up before the room's usual line returns.
const TAP_LINE_MS = 3_000

// Rae's line (raeSays, or a tap line) sits in a pixel speech bubble on the
// right wall, clear of her face and the window. The link's "Meet Rae" label
// would hide anything inside it, so screen readers get the line once from a
// sibling aria-live paragraph instead.
//
// Garden pots sit on the rug at the lower-left, clear of Rae, the window and
// the bubble. The newest one bounces in once (full motion), just fades in
// under reduced motion, and is simply there when motion is off.
//
// Tapping Rae hops her (full motion only - the global reduced/off rules
// already clamp the keyframe to nothing) and puffs a few petals (full
// motion only, purely decorative).
const ROOM_STYLE = `
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

.rae-pots { position: absolute; left: 10px; bottom: 12px; display: flex; align-items: flex-end; gap: 2px; }
.rae-pots__new { animation: rae-pot-bounce 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; transform-origin: 50% 100%; }
:root[data-motion='reduced'] .rae-pots__new { animation: rae-pot-fade 220ms ease-out both; }
:root[data-motion='off'] .rae-pots__new { animation: none; }
@keyframes rae-pot-bounce { 0% { opacity: 0; transform: translateY(16px) scale(0.5); } 70% { opacity: 1; transform: translateY(-3px) scale(1.08); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes rae-pot-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rae-pots__new { animation: rae-pot-fade 220ms ease-out both; } }

.rae-figure-btn { display: block; background: none; border: none; margin: 0; padding: 0; line-height: 0; cursor: pointer; }
.rae-hop { display: block; transform-origin: 50% 100%; animation: rae-hop 0.5s cubic-bezier(0.3, 0.7, 0.4, 1) both; }
@keyframes rae-hop {
  0% { transform: translateY(0) scaleY(1); }
  20% { transform: translateY(2px) scaleY(0.94); }
  55% { transform: translateY(-16px) scaleY(1.05); }
  80% { transform: translateY(0) scaleY(0.97); }
  100% { transform: translateY(0) scaleY(1); }
}

.rae-petal-puff { position: absolute; left: 50%; top: 32%; width: 0; height: 0; pointer-events: none; }
.rae-petal-puff i { position: absolute; left: 0; top: 0; width: 4px; height: 4px; opacity: 0; animation: rae-petal-burst 0.6s ease-out both; }
@keyframes rae-petal-burst { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.4); } }
/* Purely decorative - gone under reduced/off, never carries information. */
:root[data-motion='reduced'] .rae-petal-puff, :root[data-motion='off'] .rae-petal-puff { display: none; }
@media (prefers-reduced-motion: reduce) { .rae-petal-puff { display: none; } }

.rae-meet-btn { position: absolute; right: 8px; bottom: 8px; background-color: rgb(255 253 248 / 0.9); }
` + SEASON_DECOR_STYLE + ROOM_GROWTH_STYLE + AFTERGLOW_DECOR_STYLE

const PETALS = [
  { x: -14, y: -14, color: '#ff8fb8' },
  { x: 10, y: -20, color: '#ffd27a' },
  { x: -6, y: -26, color: '#c9b8ff' },
  { x: 16, y: -6, color: '#9ee6c4' },
  { x: -18, y: 0, color: '#ff8fb8' },
]

function PetalPuff() {
  return (
    <span className="rae-petal-puff" aria-hidden="true">
      {PETALS.map((p, i) => (
        <i key={i} style={{ background: p.color, animationDelay: `${i * 0.02}s`, '--px': `${p.x}px`, '--py': `${p.y}px` } as CSSProperties} />
      ))}
    </span>
  )
}

export function RaeHero({
  part,
  says,
  flowers = [],
  level = 1,
  pose = null,
}: {
  part: DayPart
  says?: string
  // All grown garden flowers, oldest first (as buildGarden returns them).
  flowers?: readonly GardenFlower[]
  // Bloom level (xp.ts): what the room has grown to show (roomUnlocks.ts).
  level?: number
  // On a workout day: Rae doing today's first move (TodayScreen's
  // firstRaeLoop) instead of standing. The room keeps its size.
  pose?: { loop: RaeLoop } | null
}) {
  const { motion } = useTheme()
  const osPrefersReduced = usePrefersReducedMotion()
  const animatePose = effectiveMotion(motion, osPrefersReduced) === 'full'
  // If the move's image can't load (precache failed, offline), she stands.
  const [poseFailed, setPoseFailed] = useState(false)
  const showPose = pose != null && !poseFailed
  const [skyTop, skyBottom] = SKY[part]
  const night = part === 'night'

  // Season: an explicit `?season=` URL override wins (screenshots/tests),
  // then a dev-only localStorage override, then the real meteorological
  // season for today. Never a notion of "limited time" - it just quietly
  // matches the calendar.
  const location = useLocation()
  const now = new Date()
  const storage = typeof window === 'undefined' ? null : window.localStorage
  const season = resolveSeason(now, location.search, storage)
  const accent = resolveHolidayAccent(now, location.search, storage)

  // Afterglow: the room stays warm and celebratory on a day a workout was
  // finished, derived from the same `flowers` prop (newest flower's
  // endedAt is today in local time) - see afterglow.ts.
  const afterglow = isAfterglowDay(flowers, now)

  // Room growth: an explicit `?level=` override wins (screenshots/e2e),
  // same shape as the season override above.
  const roomLevel = resolveRoomLevel(level, location.search)
  const unlocked = unlockedRoomItems(roomLevel)
  const newest = newestUnlock(roomLevel)
  const [revealNewestUnlock, setRevealNewestUnlock] = useState(false)
  const decidedUnlock = useRef(false)
  useEffect(() => {
    if (newest == null || decidedUnlock.current) return
    decidedUnlock.current = true
    let seenLevel: number | null = null
    try {
      const raw = localStorage.getItem(roomUnlocksSeenKey())
      seenLevel = raw == null ? null : Number(raw)
    } catch {
      // Storage blocked: never reveals, but never throws either.
    }
    setRevealNewestUnlock(shouldRevealNewestUnlock(seenLevel, newest.level))
    try {
      localStorage.setItem(roomUnlocksSeenKey(), String(newest.level))
    } catch {
      // Not persisted: may twinkle again next time, which is harmless.
    }
  }, [newest])

  const pots = newestFlowers(flowers, MAX_POTS)
  const newestId = pots.length > 0 ? pots[pots.length - 1].sessionId : null

  const [revealNewest, setRevealNewest] = useState(false)
  const decided = useRef(false)
  useEffect(() => {
    if (newestId == null || decided.current) return
    decided.current = true
    let seen: string | null = null
    try {
      seen = localStorage.getItem(gardenSeenKey())
    } catch {
      // Storage blocked: never reveals, but never throws either.
    }
    setRevealNewest(shouldRevealNewestFlower(seen, newestId))
    try {
      localStorage.setItem(gardenSeenKey(), newestId)
    } catch {
      // Not persisted: may bounce again next time, which is harmless.
    }
  }, [newestId])

  const [tapLine, setTapLine] = useState<string | null>(null)
  const [hopId, setHopId] = useState(0)
  const lastLine = useRef<string | undefined>(undefined)
  const tapTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(tapTimer.current), [])

  function sayHi() {
    const line = pickTapLine(RAE_TAP_LINES, Math.random, lastLine.current)
    lastLine.current = line
    setTapLine(line)
    setHopId((n) => n + 1)
    window.clearTimeout(tapTimer.current)
    tapTimer.current = window.setTimeout(() => setTapLine(null), TAP_LINE_MS)
  }

  const line = tapLine ?? says

  return (
    <>
    <div className={`rae-room block rae-room--${part}${afterglow ? ' rae-room--afterglow' : ''}`} data-afterglow={afterglow}>
      <style>{ROOM_STYLE}</style>
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
            fill={bulbColor(i, unlocked.includes('lightsUpgrade'))}
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

        <SeasonRoomDecor
          season={season}
          accent={accent}
          showSunGlint={!night}
          sunCx={90}
          sunCy={part === 'evening' ? 118 : 68}
        />

        <RoomGrowthDecor items={unlocked} newest={newest?.item ?? null} reveal={revealNewestUnlock} />

        {afterglow && <AfterglowDecor />}
      </svg>

      {pots.length > 0 && (
        <div className="rae-pots" aria-hidden="true" data-testid="rae-pots">
          {pots.map((flower, i) => {
            const isNewest = i === pots.length - 1
            return (
              <span
                key={flower.goal ? `${flower.sessionId}:goal` : flower.sessionId}
                className={revealNewest && isNewest ? 'rae-pots__new' : ''}
                style={isNewest && afterglow ? { position: 'relative', display: 'inline-block' } : undefined}
              >
                {isNewest && afterglow && <span className="rae-pots__halo" aria-hidden="true" />}
                <PixelBloom size={24} animate={false} species={flower.species} />
              </span>
            )
          })}
        </div>
      )}

      <span className={`rae-room__figure ${showPose ? 'rae-room__figure--move' : ''}`}>
        <button type="button" className="rae-figure-btn" aria-label="Say hi to Rae" onClick={sayHi}>
          <span key={hopId} className={hopId > 0 ? 'rae-hop' : ''}>
            {showPose ? (
              <span onErrorCapture={() => setPoseFailed(true)}>
              <RaeExerciseLoop
                id={pose!.loop.id}
                name={pose!.loop.name.toLowerCase()}
                width={pose!.loop.width}
                height={pose!.loop.height}
                stills={[pose!.loop.stills[pose!.loop.stills.length - 1]]}
                animate={animatePose}
                imgClassName="rae-room__move"
              />
              </span>
            ) : (
              <RaeFigure view="front" height={250} />
            )}
          </span>
        </button>
        {hopId > 0 && <PetalPuff key={hopId} />}
      </span>

      {line && (
        <span className="rae-says" aria-hidden data-testid="rae-says">
          {line}
          <span className="rae-says__tail" />
        </span>
      )}

      <Link to="/rae" aria-label="Meet Rae" className="rae-meet-btn stepper-btn">
        ›
      </Link>
    </div>
    {line && (
      <p className="sr-only" aria-live="polite">
        Rae says: {line}
      </p>
    )}
    </>
  )
}
