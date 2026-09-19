import { useEffect, useState } from 'react'
import { db } from '../../infrastructure/db/schema'
import { getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { getTemplate } from '../../domain/content/catalog'
import type { SessionResult } from '../../domain/session/types'

type HistoryRow = SessionResult & { workoutName: string }

export function ProgressScreen() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null)

  useEffect(() => {
    load().then(setRows)
  }, [])

  async function load(): Promise<HistoryRow[]> {
    const results = await db.sessionResults.toArray()
    const sorted = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    return Promise.all(
      sorted.map(async (result) => {
        const plan = await getPlan(result.planId)
        const workoutName = (plan && (await getTemplate(plan.templateId))?.name) ?? 'Workout'
        return { ...result, workoutName }
      })
    )
  }

  const totalWorkouts = rows?.length ?? 0
  const totalSets = rows?.reduce((sum, r) => sum + r.totalSetsCompleted, 0) ?? 0

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>

      {rows === null && <p className="text-ink-muted">Loading…</p>}

      {rows && rows.length === 0 && (
        <p className="text-ink-muted">No workouts yet. Your first one will show up here.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="flex gap-3">
          <Stat value={totalWorkouts} label={totalWorkouts === 1 ? 'workout' : 'workouts'} />
          <Stat value={totalSets} label="sets done" />
        </div>
      )}

      <ul className="space-y-2">
        {rows?.map((row) => (
          <li key={row.sessionId} className="rounded-panel border border-edge bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{row.workoutName}</p>
              <p className="text-xs text-ink-muted">{formatDate(row.endedAt)}</p>
            </div>
            <p className="text-sm text-ink-muted">
              {row.totalSetsCompleted}/{row.totalSetsPlanned} sets
              {row.status === 'COMPLETED_SHORTENED' ? ' · ended early' : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 rounded-panel border border-edge bg-surface p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
