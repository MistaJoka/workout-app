import { useEffect, useState } from 'react'
import { shortDate } from '../format'
import { visibleAchievements } from '../../domain/progress/achievements'
import type { EvaluatedAchievement } from '../../domain/progress/achievements'
import { AchievementBadge, loadAchievements } from '../components/AchievementUnlocks'
import { BackButton } from '../components/BackButton'
import { ShareCardButton } from '../components/ShareCardButton'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'

// The badge collection. Earned badges are in colour with the day they were
// earned; the rest are soft silhouettes behind one "still to find" row that
// say how to earn them, as an invitation. Nothing here can be lost.
export function AchievementsScreen() {
  const [all, setAll] = useState<EvaluatedAchievement[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    loadAchievements()
      .then((next) => {
        if (!cancelled) setAll(next)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (failed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load your badges.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }
  if (!all) {
    return (
      <Skeleton className="p-4 space-y-4">
        <SkeletonHeading />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-36 rounded-panel" />
          ))}
        </div>
      </Skeleton>
    )
  }

  // Earned first, newest first; the rest wait behind one "still to find"
  // row, closest to done first. Locked ladder tiers past the next one stay
  // hidden until they're next.
  const earned = all.filter((a) => a.unlockedAt).sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
  const locked = visibleAchievements(all)
    .filter((a) => !a.unlockedAt)
    .sort((a, b) => ratio(b) - ratio(a))

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-sm text-ink-muted">
          {earned.length} of {all.length} earned
        </p>
      </div>
      {earned.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Earned">
          {earned.map((a) => (
            <li
              key={a.id}
              className="card relative flex flex-col items-center gap-1 px-1.5 pb-2 pt-3 text-center"
              aria-label={`${a.title}, earned ${shortDate(a.unlockedAt!)}`}
            >
              <div className="absolute -right-2 -top-2">
                <ShareCardButton
                  compact
                  aria-label={`Share ${a.title} badge`}
                  data={{ kind: 'badge', id: a.id, title: a.title, description: a.description, icon: a.icon, unlockedAt: a.unlockedAt! }}
                />
              </div>
              <AchievementBadge icon={a.icon} size={44} />
              <p className="text-sm font-bold leading-tight">{a.title}</p>
              <p className="text-[11px] text-ink-muted">{shortDate(a.unlockedAt!)}</p>
            </li>
          ))}
        </ul>
      )}
      {locked.length > 0 && (
        <details className="group space-y-3" data-testid="badges-locked">
          <summary className="card flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
            <AchievementBadge icon={locked[0].icon} locked size={36} />
            <span className="flex-1 font-semibold">{locked.length} still to find</span>
            <span className="text-xl text-ink-muted transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <ul className="grid grid-cols-2 gap-2">
            {locked.map((a) => (
              <li
                key={a.id}
                className="card flex flex-col items-center gap-1.5 p-2.5 text-center opacity-80"
                aria-label={`${a.title}, not yet: ${a.description}${a.progress ? ` ${a.progress.current} of ${a.progress.target} ${a.progress.unit}.` : ''}`}
              >
                <AchievementBadge icon={a.icon} locked size={40} />
                <p className="font-bold leading-tight text-ink-muted">{a.title}</p>
                <p className="text-xs leading-snug text-ink-muted">{a.description}</p>
                {a.progress && (
                  <div className="w-full space-y-1" aria-hidden="true" data-testid="badge-progress">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.round((a.progress.current / a.progress.target) * 100)}%` }}
                      />
                    </div>
                    <p className="hud-num text-xs font-semibold text-ink-muted">
                      {a.progress.current} / {a.progress.target} {a.progress.unit}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function ratio(a: EvaluatedAchievement): number {
  return a.progress ? a.progress.current / a.progress.target : 0
}

