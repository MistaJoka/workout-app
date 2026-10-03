import { useEffect, useState } from 'react'
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { computeXp } from '../../domain/progress/xp'
import { nextGoal } from '../../domain/progress/nextGoal'

// One line after the reward moments: whichever steady goal (workout
// milestone or level, domain/progress/nextGoal.ts) this finished session
// left closest. Read fresh from history every time, like the rest of this
// screen; renders nothing while loading or if history can't be read — a
// bonus line, never a blocker.
export function NextUpTeaser() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllSessionHistory(), getWeeklySchedule()])
      .then(async ([history, schedule]) => {
        const goals = await loadWeekGoals({ ...history, schedule })
        if (cancelled) return
        const totalXp = computeXp(history, goals).total
        setLabel(nextGoal(history.results.length, totalXp)?.label ?? null)
      })
      .catch(() => {
        if (!cancelled) setLabel(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!label) return null
  return <p className="text-sm text-ink-muted">Next up: {label}</p>
}
