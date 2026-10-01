import { useEffect, useState } from 'react'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { projectSetRecords } from '../../domain/progress/history'
import { sessionHighlights, type SessionHighlights } from '../../domain/progress/sessionHighlights'
import type { PersonalRecord } from '../../domain/progress/types'
import { formatWeight, type WeightUnit } from '../units'
import { useWeightUnit } from './useWeightUnit'

// At most two lines worth celebrating under Complete's stats: a milestone
// ("10 workouts!") and/or a new best, never a list. Self-contained and best
// effort, like the rest of the finish screen: if history can't be read it
// renders nothing. The pop is a plain CSS animation with no delay, so the
// global reduced/off motion rule collapses it to the final state.
export function CompleteHighlights({ sessionId }: { sessionId: string }) {
  const [unit] = useWeightUnit()
  const [highlights, setHighlights] = useState<SessionHighlights | null>(null)

  useEffect(() => {
    let cancelled = false
    getAllSessionHistory()
      .then(({ plans, results, events }) => {
        if (cancelled) return
        setHighlights(sessionHighlights(projectSetRecords(plans, results, events), results, sessionId))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (!highlights) return null
  const lines: string[] = []
  if (highlights.milestone != null) lines.push(milestoneLine(highlights.milestone))
  const best = highlights.newBests[0]
  if (best) {
    const more = highlights.newBests.length - 1
    lines.push(`New best: ${best.exerciseName}, ${describeBest(best, unit)}${more > 0 ? ` (+${more} more)` : ''}`)
  }
  if (lines.length === 0) return null

  return (
    <ul className="mx-auto flex max-w-sm flex-col items-center gap-2" aria-label="Highlights">
      <style>{`@keyframes complete-highlight-pop { from { opacity: 0; scale: 0.85 } to { opacity: 1; scale: 1 } }`}</style>
      {lines.map((line) => (
        <li
          key={line}
          className="field-notice rounded-full px-4 py-2 text-sm font-bold"
          style={{ animation: 'complete-highlight-pop 320ms cubic-bezier(.2,1.4,.4,1) both' }}
        >
          {line}
        </li>
      ))}
    </ul>
  )
}

function milestoneLine(count: number): string {
  return count === 1 ? 'Your first workout!' : `${count} workouts!`
}

function describeBest(best: PersonalRecord, unit: WeightUnit): string {
  if (best.unit === 'seconds') return `${best.value}s`
  if (best.unit === 'kg') return `${best.reps ?? ''}${best.reps != null ? ' × ' : ''}${formatWeight(best.value, unit)}`
  return `${best.value} reps`
}
