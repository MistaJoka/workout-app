import { useEffect, useState } from 'react'
import { loadNextUpLabel } from '../../application/progressSnapshot'

// One line after the reward moments: whichever steady goal (workout
// milestone, level, or the next tier of a badge ladder; domain/progress/nextGoal.ts) this finished session
// left closest. Read fresh from history every time, like the rest of this
// screen; renders nothing while loading or if history can't be read — a
// bonus line, never a blocker.
export function NextUpTeaser() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadNextUpLabel()
      .then((next) => {
        if (!cancelled) setLabel(next)
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
