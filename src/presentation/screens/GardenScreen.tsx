import { useEffect, useState } from 'react'
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
import { BackButton } from '../components/BackButton'
import { LoreSheet, type LoreSheetTarget } from '../components/LoreSheet'
import { Meadow } from '../components/Meadow'
import { PixelBloom } from '../components/PixelBloom'
import { RaeNote } from '../components/RaeNote'
import { ShareCardButton } from '../components/ShareCardButton'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'
import {
  GARDEN_SPECIES,
  RARITY_LABEL,
  TIER_ORDER,
  buildGarden,
  buildGardenSets,
  type Garden,
  type GardenFlower,
  type Rarity,
  type TierProgress,
} from '../../domain/progress/garden'
import { db } from '../../infrastructure/db/schema'

// The collection: every species a workout can grow. Found ones show their
// flower, name and how many have grown; the rest wait as a "?" tile, a
// little curiosity about what the next workout might bring. Nothing here
// can be lost: the garden only grows. Species are grouped by rarity tier,
// and each tier is its own little set to complete (Sets, above the grid):
// find every species of a tier and its pots turn gold, everywhere they
// appear, with the date the set was finished.

const SETS_SEEN_KEY = 'workout-app:garden-sets-seen'

function loadSeenSets(): Set<Rarity> {
  try {
    const raw = localStorage.getItem(SETS_SEEN_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(parsed.filter((r): r is Rarity => TIER_ORDER.includes(r as Rarity)))
  } catch {
    return new Set()
  }
}

function saveSeenSets(seen: ReadonlySet<Rarity>): void {
  try {
    localStorage.setItem(SETS_SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // Storage unavailable: the celebration just shows again next visit.
  }
}

function formatCompletedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Earliest endedAt each species was grown, for the lore card's "First
// grown" line. flowers are oldest-first, so the first match per id wins.
function firstGrownMap(flowers: readonly GardenFlower[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const flower of flowers) {
    if (!map.has(flower.species.id)) map.set(flower.species.id, flower.endedAt)
  }
  return map
}

const CELEBRATE_STYLE = `
.garden-sets__celebrate { animation: garden-sets-celebrate-in 380ms ease-out both; }
[data-motion='reduced'] .garden-sets__celebrate, [data-motion='off'] .garden-sets__celebrate { animation: none; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .garden-sets__celebrate { animation: none; } }
@keyframes garden-sets-celebrate-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`

// A one-time card the first time a set (or sets) is seen complete. Shown
// once per tier, ever — tracked in localStorage, never re-shown on a later
// visit, and never required to see the Sets section itself (that always
// shows every tier's real state).
function SetCompleteCelebration({ tiers, onDismiss }: { tiers: TierProgress[]; onDismiss: () => void }) {
  const names = tiers.map((t) => t.label)
  const headline =
    names.length === 1
      ? `${names[0]} set complete!`
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} sets complete!`
  return (
    <div
      className="garden-sets__celebrate card relative flex items-center gap-3 bg-field-notice p-3"
      role="status"
      data-testid="garden-set-celebration"
    >
      <style>{CELEBRATE_STYLE}</style>
      <PixelBloom size={40} animate={false} golden bloomed={false} />
      <div className="flex-1">
        <p className="font-extrabold">{headline}</p>
        <p className="text-sm text-ink-muted">Every flower in {names.length === 1 ? 'this set' : 'these sets'} found. Its pots turn gold.</p>
      </div>
      <button
        type="button"
        className="btn-ghost min-h-11 min-w-11 shrink-0"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

function SetsSection({ tiers }: { tiers: TierProgress[] }) {
  return (
    <section aria-label="Sets" className="space-y-2">
      <h2 className="text-lg font-bold">Sets</h2>
      <ul className="space-y-2">
        {tiers.map((tier) => {
          const pct = tier.total === 0 ? 0 : Math.round((tier.discovered / tier.total) * 100)
          const label = `${tier.label}: ${tier.discovered} of ${tier.total}${tier.complete ? ', complete' : ''}`
          return (
            <li key={tier.rarity} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-bold">{tier.label}</p>
                  <p aria-hidden="true" className="hud-num text-sm text-ink-muted">
                    {tier.discovered} of {tier.total}
                  </p>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={tier.total}
                  aria-valuenow={tier.discovered}
                  aria-label={label}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {tier.complete && tier.completedAt && (
                <div className="flex shrink-0 flex-col items-center gap-0.5" aria-hidden="true">
                  <PixelBloom size={32} animate={false} golden bloomed={false} />
                  <span className="text-[10px] font-semibold text-ink-muted">{formatCompletedAt(tier.completedAt)}</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function GardenScreen() {
  const [garden, setGarden] = useState<Garden | null>(null)
  const [failed, setFailed] = useState(false)
  const [celebrating, setCelebrating] = useState<TierProgress[]>([])
  const [loreTarget, setLoreTarget] = useState<LoreSheetTarget | null>(null)

  useEffect(() => {
    db.sessionResults
      .toArray()
      .then(async (results) => setGarden(buildGarden(results, await loadWeekGoals({ results }))))
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    if (!garden) return
    const sets = buildGardenSets(garden)
    const seen = loadSeenSets()
    const newlyComplete = sets.tiers.filter((t) => t.complete && !seen.has(t.rarity))
    if (newlyComplete.length === 0) return
    setCelebrating(newlyComplete)
    const updated = new Set(seen)
    for (const t of newlyComplete) updated.add(t.rarity)
    saveSeenSets(updated)
  }, [garden])

  const sets = garden ? buildGardenSets(garden) : null
  const completeRarities = new Set<Rarity>(sets ? sets.tiers.filter((t) => t.complete).map((t) => t.rarity) : [])
  const firstGrownAt = garden ? firstGrownMap(garden.flowers) : new Map<string, string>()
  // Species ever grown by a goal bloom (garden.ts's GardenFlower `goal`
  // flag), so the lore card can say so -- a species can also have ordinary
  // growings; one goal-grown flower is enough to mention it.
  const goalGrownSpecies = new Set<string>(garden ? garden.flowers.filter((f) => f.goal).map((f) => f.species.id) : [])

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your garden</h1>
          {garden && (
            <p className="text-sm text-ink-muted">
              {garden.flowers.length} {garden.flowers.length === 1 ? 'flower' : 'flowers'} grown, {garden.discovered} of{' '}
              {garden.total} kinds found
            </p>
          )}
        </div>
        {garden && <ShareCardButton label="Share" aria-label="Share your garden" data={{ kind: 'garden', garden }} />}
      </div>

      {failed && <p>Couldn't open your garden on this device.</p>}
      {!garden && !failed && (
        <Skeleton className="space-y-3">
          <SkeletonHeading />
          <SkeletonBlock className="h-64 rounded-panel" />
        </Skeleton>
      )}

      {garden && sets && (
        <>
          {celebrating.length > 0 && (
            <SetCompleteCelebration tiers={celebrating} onDismiss={() => setCelebrating([])} />
          )}
          <Meadow flowers={garden.flowers} completeRarities={completeRarities} />
          <RaeNote expression={garden.flowers.length === 0 ? 'smile' : 'laugh'}>
            {garden.flowers.length === 0
              ? 'Every workout grows a flower here. Which one will you get?'
              : 'Every workout grows a new flower. Some are rare!'}
          </RaeNote>
          <SetsSection tiers={sets.tiers} />
          {TIER_ORDER.map((rarity) => {
            const species = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
            const tier = sets.tiers.find((t) => t.rarity === rarity)!
            return (
              <div key={rarity} className="space-y-2">
                <h3 className="text-sm font-bold text-ink-muted">{tier.label}</h3>
                <ul className="grid grid-cols-3 gap-2">
                  {species.map((sp) => {
                    const count = garden.counts.get(sp.id) ?? 0
                    const found = count > 0
                    const rarityLabel = RARITY_LABEL[sp.rarity].replace('!', '')
                    const golden = found && completeRarities.has(sp.rarity)
                    const tileLabel = found
                      ? `${sp.name}, ${rarityLabel}, grown ${count} ${count === 1 ? 'time' : 'times'}${golden ? ', set complete' : ''}`
                      : `Not found yet, ${rarityLabel}`
                    return (
                      <li key={sp.id} aria-label={tileLabel}>
                        <button
                          type="button"
                          aria-label={tileLabel}
                          className="card flex min-h-11 w-full flex-col items-center p-2 text-center"
                          onClick={() =>
                            setLoreTarget(
                              found
                                ? {
                                    kind: 'discovered',
                                    species: sp,
                                    count,
                                    firstGrownAt: firstGrownAt.get(sp.id)!,
                                    golden,
                                    goalGrown: goalGrownSpecies.has(sp.id),
                                  }
                                : { kind: 'undiscovered', rarity: sp.rarity }
                            )
                          }
                        >
                          {found ? (
                            <PixelBloom size={52} animate={false} species={sp} golden={golden} />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex h-[71px] w-[52px] items-center justify-center rounded-control bg-field-info text-2xl font-bold text-ink-muted"
                            >
                              ?
                            </div>
                          )}
                          <p aria-hidden="true" className="mt-1 text-xs font-bold leading-tight">
                            {found ? sp.name : '???'}
                          </p>
                          <p aria-hidden="true" className="text-[11px] text-ink-muted">
                            {found ? `x${count}` : rarityLabel}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </>
      )}

      {loreTarget && <LoreSheet target={loreTarget} onClose={() => setLoreTarget(null)} />}
    </div>
  )
}
