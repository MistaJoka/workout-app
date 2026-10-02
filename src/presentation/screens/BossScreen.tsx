import { useEffect, useState } from 'react'
import { BackButton } from '../components/BackButton'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'
import { BossSprite } from '../components/BossArt'
import { AchievementBadge } from '../components/AchievementUnlocks'
import { loadBossState, loadPastBossWeeks } from '../components/bossData'
import type { BossState, BossWeekSummary } from '../../domain/game/bosses'

type BossScreenData = {
  state: BossState
  pastWeeks: BossWeekSummary[]
}

async function loadBossScreen(now: Date): Promise<BossScreenData> {
  const [state, pastWeeks] = await Promise.all([loadBossState(now), loadPastBossWeeks(now)])
  return { state, pastWeeks }
}

// The full weekly boss fight: this week's boss at full size, its HP bar,
// the day-by-day hit log, a defeated banner + trophy when it's down, and a
// gallery of past weeks. Nothing here is ever a loss screen: an undefeated
// week just reads as a gentle "escaped" (CLAUDE.md: celebrate, never
// shame, nothing lost).
export function BossScreen() {
  const [now] = useState(() => new Date())
  const [data, setData] = useState<BossScreenData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    loadBossScreen(now)
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [now, attempt])

  if (failed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load this week's boss.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <SkeletonBlock className="mx-auto h-40 w-40 rounded-panel" />
        <SkeletonBlock className="h-24 rounded-panel" />
      </Skeleton>
    )
  }

  const { state, pastWeeks } = data
  const defeated = state.defeatedAt !== null
  const pct = state.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((state.hp / state.maxHp) * 100))) : 0

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div className="boss-screen-hero mx-auto flex max-w-xs flex-col items-center gap-2 text-center">
        <BossSprite boss={state.boss} state={defeated ? 'defeated' : 'idle'} size={140} decorative={false} />
        <h1 className="text-2xl font-bold">{state.boss.name}</h1>
        <p className="text-sm text-ink-muted">{state.boss.flavor}</p>
      </div>

      {defeated ? (
        <div className="field-success flex items-center gap-3 rounded-panel p-4" role="status" data-testid="boss-defeated-banner">
          <AchievementBadge icon="trophy" size={40} />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{state.boss.name} defeated!</span>
            <span className="block text-sm text-ink-muted">See you next week, a brand new boss will be here.</span>
          </span>
        </div>
      ) : (
        <div className="card space-y-2 p-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>HP</span>
            <span aria-hidden="true">
              {state.hp}/{state.maxHp}
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={state.hp}
            aria-valuemin={0}
            aria-valuemax={state.maxHp}
            aria-label={`${state.boss.name}'s HP: ${state.hp} of ${state.maxHp}`}
          >
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <section className="card space-y-2 p-4" aria-label="This week's hits">
        <h2 className="font-bold">This week's hits</h2>
        {state.damageLog.length === 0 ? (
          <p className="text-sm text-ink-muted">No hits landed yet this week -- every counted set lands one.</p>
        ) : (
          <ul className="space-y-1">
            {state.damageLog.map((entry) => (
              <li key={entry.date} className="flex items-center justify-between text-sm">
                <span>{weekdayLabel(entry.date)}</span>
                <span className="text-ink-muted">
                  {entry.hits} {entry.hits === 1 ? 'hit' : 'hits'}
                  {entry.crits > 0 ? `, ${entry.crits} ${entry.crits === 1 ? 'crit' : 'crits'}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-label="Past bosses">
        <h2 className="px-1 text-sm font-semibold text-ink-muted">Past bosses</h2>
        {pastWeeks.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">Your first week's boss is still ahead of you.</p>
        ) : (
          <ul className="card divide-y-2 divide-[var(--color-border)] overflow-hidden">
            {pastWeeks.map((week) => (
              <li key={week.weekStart} className="flex items-center gap-3 px-4 py-3">
                <BossSprite boss={week.boss} state={week.defeatedAt ? 'defeated' : 'idle'} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{week.boss.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {shortDayKey(week.weekStart)} -- {week.defeatedAt ? `defeated ${shortDate(week.defeatedAt)}` : 'escaped'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// `dayKey`/`weekStart` are local-calendar date-only strings (YYYY-MM-DD,
// bosses.ts's localDayKey): parsed as local y/m/d, never `new Date(iso)`,
// which reads a date-only string as UTC midnight and can land a day off.
function localDateFromKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function weekdayLabel(dayKey: string): string {
  return localDateFromKey(dayKey).toLocaleDateString(undefined, { weekday: 'short' })
}

function shortDayKey(dayKey: string): string {
  return localDateFromKey(dayKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
