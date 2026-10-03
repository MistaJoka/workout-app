import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { dayPart, type DayPart } from '../greeting'
import { layoutMeadow } from '../../domain/progress/meadowLayout'
import { PixelBloom } from './PixelBloom'
import { MeadowCritters } from './MeadowCritters'
import type { GardenFlower, Rarity } from '../../domain/progress/garden'

// The garden's meadow: every flower a finished workout has ever grown,
// planted together, oldest at the back and newest at the front. Placement
// comes from layoutMeadow (deterministic, seeded by session id), so the
// scene never reshuffles — a new flower just joins the end of its row. The
// sky follows the time of day the same way RaeHero's window does. Each
// flower is a real link to that workout (/history/:sessionId) with a 44px
// tap target regardless of how small it is drawn; the "Every flower" list
// below repeats the same links in a plain, always-44px-tall list, for
// anyone who'd rather not aim at a tiny back-row bloom.

const SKY: Record<DayPart, [string, string]> = {
  morning: ['#bfe3ff', '#fff4d6'],
  afternoon: ['#9fd4ff', '#dff1ff'],
  evening: ['#ffb38a', '#ffd6e7'],
  night: ['#3b3a6b', '#6d5fa8'],
}

const GRASS: Record<DayPart, [string, string]> = {
  morning: ['#9fdcae', '#5fab79'],
  afternoon: ['#a3e0b2', '#63b17d'],
  evening: ['#8fc89f', '#4f8f67'],
  night: ['#3f5f52', '#273a32'],
}

const MIN_FLOWER_SIZE = 24
const MAX_FLOWER_SIZE = 46

// A blocky zig-zag top edge, pixel-grass style, as a clip-path polygon.
function grassClipPath(teeth: number): string {
  const step = 100 / teeth
  const points = ['0% 100%', '0% 30%']
  for (let i = 0; i < teeth; i++) {
    const xLow = i * step
    const xHigh = xLow + step / 2
    points.push(`${xLow}% 30%`, `${xLow}% 0%`, `${xHigh}% 0%`, `${xHigh}% 30%`)
  }
  points.push('100% 30%', '100% 100%')
  return `polygon(${points.join(', ')})`
}

const GRASS_CLIP = grassClipPath(18)

const STYLE = `
.meadow__flower {
  transform-origin: 50% 100%;
  animation: meadow-sway var(--sway-dur, 3s) ease-in-out var(--sway-delay, 0s) infinite alternate both;
}
[data-motion='reduced'] .meadow__flower, [data-motion='off'] .meadow__flower { animation-delay: 0s !important; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .meadow__flower { animation-delay: 0s !important; } }
@keyframes meadow-sway {
  from { transform: translateY(var(--lift, 0px)) rotate(calc(var(--tilt, 0deg) - 3deg)); }
  to { transform: translateY(var(--lift, 0px)) rotate(calc(var(--tilt, 0deg) + 3deg)); }
}
`

function flowerLabel(flower: GardenFlower): string {
  const when = new Date(flower.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const rare = flower.species.rarity === 'rare' || flower.species.rarity === 'legendary' ? ', rare' : ''
  const goal = flower.goal ? ', a goal bloom grown by meeting your weekly goal' : ''
  return `${flower.species.name}${rare}${goal}, grown ${when}. Open this workout.`
}

// A goal bloom's small pixel ribbon/star -- same marker and 7x7
// grid/crispEdges convention as LoreSheet's GoalRibbon, drawn decoratively
// (flowerLabel/the list row already say it in words).
function GoalRibbonIcon({ size = 10 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges">
      <rect x="3" y="0" width="1" height="1" fill="#ffc940" />
      <rect x="2" y="1" width="3" height="1" fill="#ffc940" />
      <rect x="1" y="2" width="5" height="1" fill="#ffd966" />
      <rect x="0" y="3" width="7" height="1" fill="#ffc940" />
      <rect x="1" y="4" width="2" height="1" fill="#f29e0c" />
      <rect x="4" y="4" width="2" height="1" fill="#f29e0c" />
      <rect x="0" y="5" width="2" height="1" fill="#f29e0c" />
      <rect x="5" y="5" width="2" height="1" fill="#f29e0c" />
      <rect x="0" y="6" width="1" height="1" fill="#f29e0c" />
      <rect x="6" y="6" width="1" height="1" fill="#f29e0c" />
    </svg>
  )
}

function GoalRibbonBadge() {
  return (
    <span className="pointer-events-none absolute right-0 top-0">
      <GoalRibbonIcon />
    </span>
  )
}

// A goal bloom reuses the real session that earned it for its link and
// `data-session-id` (it really did grow from that workout), but needs its
// own identity for layout/React-key purposes so it never collides with
// that same session's ordinary flower.
function flowerKey(flower: GardenFlower): string {
  return flower.goal ? `${flower.sessionId}:goal` : flower.sessionId
}

function FlowerSpot({ flower, size, golden, tiltDeg, liftPx, driftPx, swayDelaySec, swayDurationSec }: {
  flower: GardenFlower
  size: number
  golden: boolean
  tiltDeg: number
  liftPx: number
  driftPx: number
  swayDelaySec: number
  swayDurationSec: number
}) {
  return (
    <Link
      to={`/history/${flower.sessionId}`}
      aria-label={flowerLabel(flower)}
      data-testid="meadow-flower"
      data-session-id={flower.sessionId}
      data-goal-bloom={flower.goal ? 'true' : undefined}
      className="meadow__flower relative flex min-h-11 min-w-11 shrink-0 items-end justify-center rounded-control active:bg-white/20"
      style={
        {
          '--tilt': `${tiltDeg}deg`,
          '--lift': `${liftPx}px`,
          '--sway-delay': `${swayDelaySec}s`,
          '--sway-dur': `${swayDurationSec}s`,
          marginLeft: `${driftPx}px`,
        } as CSSProperties
      }
    >
      <PixelBloom size={size} animate={false} species={flower.species} golden={golden} />
      {flower.goal && <GoalRibbonBadge />}
    </Link>
  )
}

export function Meadow({
  flowers,
  completeRarities = new Set(),
}: {
  flowers: readonly GardenFlower[]
  // Rarity tiers that are fully collected: their flowers grow in golden pots.
  completeRarities?: ReadonlySet<Rarity>
}) {
  const part = dayPart(new Date())
  const [skyTop, skyBottom] = SKY[part]
  const [grassBack, grassFront] = GRASS[part]
  const night = part === 'night'

  // layoutMeadow/the row map are keyed by flowerKey, not the raw sessionId:
  // a goal bloom shares its triggering workout's real sessionId (so it
  // still links to that workout), but needs its own identity here so it
  // never collides with that same session's ordinary flower.
  const spots = layoutMeadow(flowers.map(flowerKey))
  const byKey = new Map(flowers.map((f) => [flowerKey(f), f]))
  const rowsUsed = spots.length === 0 ? 1 : Math.max(...spots.map((s) => s.row)) + 1
  const rows: { row: number; items: typeof spots }[] = Array.from({ length: rowsUsed }, (_, row) => ({
    row,
    items: spots.filter((s) => s.row === row),
  }))

  return (
    <div className="meadow card relative overflow-hidden" data-testid="meadow">
      <style>{STYLE}</style>
      <MeadowCritters flowerCount={flowers.length} />
      <div
        className="meadow__sky relative h-24"
        style={{ backgroundImage: `linear-gradient(to bottom, ${skyTop}, ${skyBottom})` }}
        aria-hidden
      >
        {night ? (
          <>
            <div className="absolute left-4 top-3 h-4 w-4 rounded-full bg-[#fff6d8]" />
            <div className="absolute left-16 top-6 h-1 w-1 bg-white" />
            <div className="absolute right-10 top-4 h-1 w-1 bg-white" />
            <div className="absolute right-24 top-9 h-1 w-1 bg-white" />
          </>
        ) : (
          <div
            className="absolute right-6 top-3 h-6 w-6 rounded-full"
            style={{ backgroundColor: part === 'evening' ? '#ffe08a' : '#fff6c9' }}
          />
        )}
      </div>

      <div
        className="meadow__grass relative overflow-x-auto"
        style={{ backgroundColor: grassFront }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-3"
          style={{ backgroundColor: grassBack, clipPath: GRASS_CLIP }}
          aria-hidden
        />
        <div className="inline-flex min-w-full flex-col gap-3 px-3 pb-3 pt-4">
          {flowers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <svg viewBox="0 0 16 12" width="40" height="30" shapeRendering="crispEdges" aria-hidden>
                {/* A little mound of soil with one seed waiting on top. */}
                <rect x="3" y="8" width="10" height="3" fill="#7a5038" />
                <rect x="2" y="9" width="12" height="2" fill="#6b4530" />
                <rect x="6" y="5" width="4" height="3" fill="#a9754f" />
                <rect x="7" y="6" width="2" height="1" fill="#d9a877" />
              </svg>
              {/* A dark pill keeps white text readable on every day-part's
                  grass (white on the daytime greens alone is ~2.8:1). */}
              <p className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
                Your first workout plants the first flower.
              </p>
            </div>
          ) : (
            rows.map(({ row, items }) => {
              const depth = rowsUsed <= 1 ? 1 : row / (rowsUsed - 1)
              const size = Math.round(MIN_FLOWER_SIZE + depth * (MAX_FLOWER_SIZE - MIN_FLOWER_SIZE))
              // Alternate rows start a little further in, so same-index
              // flowers in different rows don't line up into a grid.
              const rowOffset = row % 2 === 0 ? 0 : size / 2
              return (
                <div
                  key={row}
                  className="meadow__row flex items-end gap-2"
                  data-testid="meadow-row"
                  data-row={row}
                  style={{ marginLeft: `${rowOffset}px` }}
                >
                  {items.map((spot) => {
                    const flower = byKey.get(spot.sessionId)
                    if (!flower) return null
                    return (
                      <FlowerSpot
                        key={spot.sessionId}
                        flower={flower}
                        size={size}
                        golden={completeRarities.has(flower.species.rarity)}
                        tiltDeg={spot.tiltDeg}
                        liftPx={spot.liftPx}
                        driftPx={spot.driftPx}
                        swayDelaySec={spot.swayDelaySec}
                        swayDurationSec={spot.swayDurationSec}
                      />
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>

      {flowers.length > 0 && (
        <details className="meadow__list border-t-2 border-[var(--color-border)] bg-surface px-3 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-primary-ink">
            Every flower ({flowers.length})
          </summary>
          <ul className="space-y-1 pb-1">
            {[...flowers].reverse().map((flower) => (
              <li key={flowerKey(flower)}>
                <Link
                  to={`/history/${flower.sessionId}`}
                  aria-label={flowerLabel(flower)}
                  className="flex min-h-11 items-center gap-2 rounded-control px-1 active:bg-field-primary"
                >
                  <PixelBloom size={24} animate={false} species={flower.species} golden={completeRarities.has(flower.species.rarity)} />
                  <span aria-hidden="true" className="text-sm">
                    {flower.species.name} · {new Date(flower.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {flower.goal && <GoalRibbonIcon size={12} />}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
