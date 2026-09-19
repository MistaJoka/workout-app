import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ROTATION,
  foundationStrengthStarterTemplates,
  templateById,
} from '../../domain/content/fixtures/foundationStrengthStarter'
import { getInProgressSessions, getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { db } from '../../infrastructure/db/schema'
import type { SessionPlan } from '../../domain/session/types'

function estimateMinutes(templateId: string): number {
  const template = templateById.get(templateId)
  if (!template) return 0
  // ~3s per rep, plus ~15s per set to get into position; rounded up to 5 min.
  const seconds = template.exercises.reduce((sum, e) => {
    const work = e.prescription.timeSeconds ?? (e.prescription.reps ?? 0) * 3
    return sum + e.prescription.sets * (work + e.prescription.restSeconds + 15)
  }, 0)
  return Math.max(5, Math.ceil(seconds / 60 / 5) * 5)
}

export function TodayScreen() {
  const [inProgress, setInProgress] = useState<SessionPlan[] | null>(null)
  const [suggestedId, setSuggestedId] = useState<string>(ROTATION[0])

  useEffect(() => {
    getInProgressSessions().then(setInProgress)
    suggestNext().then(setSuggestedId)
  }, [])

  async function suggestNext(): Promise<string> {
    const results = await db.sessionResults.toArray()
    const latest = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    for (const result of latest) {
      const plan = await getPlan(result.planId)
      const index = plan ? ROTATION.indexOf(plan.templateId) : -1
      if (index >= 0) return ROTATION[(index + 1) % ROTATION.length]
    }
    return ROTATION[0]
  }

  const ordered = [...foundationStrengthStarterTemplates].sort((a, b) =>
    a.id === suggestedId ? -1 : b.id === suggestedId ? 1 : 0
  )

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Today</h1>

      {inProgress === null && <p className="text-ink-muted">Loading…</p>}

      {inProgress && inProgress.length > 0 && (
        <Link
          to={`/session/${inProgress[0].id}`}
          className="block rounded-panel border-2 border-primary bg-surface p-4"
        >
          <p className="font-semibold text-primary">Resume workout</p>
          <p className="text-sm text-ink-muted">You have one in progress</p>
        </Link>
      )}

      {ordered.map((template) => {
        const suggested = template.id === suggestedId
        return (
          <Link
            key={template.id}
            to={`/checkin/${template.id}`}
            className={`block rounded-panel border bg-surface p-4 ${suggested ? 'border-primary' : 'border-edge'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-lg font-semibold">{template.name}</p>
              {suggested && <span className="text-xs font-semibold uppercase text-primary">Up next</span>}
            </div>
            <p className="text-sm text-ink-muted">
              {template.exercises.length} exercises · about {estimateMinutes(template.id)} min
            </p>
          </Link>
        )
      })}
    </div>
  )
}
