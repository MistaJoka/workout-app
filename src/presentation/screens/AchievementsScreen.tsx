import { useEffect, useState } from 'react'
import type { EvaluatedAchievement } from '../../domain/progress/achievements'
import { AchievementBadge, loadAchievements } from '../components/AchievementUnlocks'
import { BackButton } from '../components/BackButton'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'

// The badge collection. Earned badges are in colour with the day they were
// earned; the rest are soft silhouettes that say how to earn them, as an
// invitation. Nothing here can be lost.
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

  const earned = all.filter((a) => a.unlockedAt)
  // Earned first, newest first; then the rest in their natural order.
  const ordered = [
    ...earned.sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? '')),
    ...all.filter((a) => !a.unlockedAt),
  ]

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">Badges</h1>
        <p className="text-sm text-ink-muted">
          {earned.length} of {all.length} earned
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {ordered.map((a) => (
          <li
            key={a.id}
            className={`card flex flex-col items-center gap-2 p-3 text-center ${a.unlockedAt ? '' : 'opacity-80'}`}
            aria-label={a.unlockedAt ? `${a.title}, earned ${shortDate(a.unlockedAt)}` : `${a.title}, not yet: ${a.description}`}
          >
            <AchievementBadge icon={a.icon} locked={!a.unlockedAt} size={56} />
            <p className={`font-bold leading-tight ${a.unlockedAt ? '' : 'text-ink-muted'}`}>{a.title}</p>
            <p className="text-xs text-ink-muted leading-snug">{a.unlockedAt ? shortDate(a.unlockedAt) : a.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
