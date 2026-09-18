import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  foundationStrengthStarterPack,
  foundationStrengthStarterTemplate,
} from '../../domain/content/fixtures/foundationStrengthStarter'
import { getInProgressSessions } from '../../infrastructure/db/repositories/sessionRepository'
import type { SessionPlan } from '../../domain/session/types'

export function TodayScreen() {
  const [inProgress, setInProgress] = useState<SessionPlan[] | null>(null)

  useEffect(() => {
    getInProgressSessions().then(setInProgress)
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Today</h1>

      {inProgress === null && <p className="text-ink-muted">Loading…</p>}

      {inProgress && inProgress.length > 0 && (
        <Link to={`/session/${inProgress[0].id}`} className="block rounded-panel border border-edge bg-surface p-4">
          <p className="font-semibold text-primary">Resume Workout</p>
          <p className="text-sm text-ink-muted">In progress</p>
        </Link>
      )}

      <div className="rounded-panel border border-edge bg-surface p-4 space-y-2">
        <p className="font-semibold">{foundationStrengthStarterTemplate.name}</p>
        <p className="text-sm text-ink-muted">
          {foundationStrengthStarterPack.name} — {foundationStrengthStarterTemplate.exercises.length} exercises
        </p>
        <Link
          to={`/checkin/${foundationStrengthStarterTemplate.id}`}
          className="inline-block rounded-panel bg-primary px-4 py-2 text-white"
        >
          Start check-in
        </Link>
      </div>
    </div>
  )
}
