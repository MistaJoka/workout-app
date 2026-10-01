import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../../domain/content/types'
import { workoutOverview, type OverviewItem, type OverviewStatus } from '../../domain/session/overview'
import type { SessionPlan, SessionState } from '../../domain/session/types'
import { getEventsForSession } from '../../infrastructure/db/repositories/sessionRepository'
import { ExerciseThumb } from './ExerciseThumb'
import { useSheetFocus } from './useSheetFocus'

const BADGE: Record<OverviewStatus, { label: string; className: string } | null> = {
  done: { label: 'Done', className: 'bg-field-success' },
  current: { label: 'Now', className: 'bg-primary text-[var(--color-on-primary)]' },
  skipped: { label: 'Skipped', className: 'bg-bg text-ink-muted' },
  next: { label: 'Up next', className: 'bg-field-calm' },
  later: null,
}

// The whole workout mid-session: every move in order, its sets so far and
// where it stands. View-only — the order is part of the plan, so there is
// nothing to reorder or jump to. Read from the stored events when opened.
export function WorkoutOverviewSheet({
  sessionId,
  plan,
  state,
  exerciseById,
  onClose,
}: {
  sessionId: string
  plan: SessionPlan
  state: SessionState
  exerciseById: ReadonlyMap<string, Exercise>
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [items, setItems] = useState<OverviewItem[] | null>(null)
  useSheetFocus(sheetRef, onClose, { initialFocus: closeRef })

  useEffect(() => {
    let cancelled = false
    getEventsForSession(sessionId)
      .then((events) => {
        if (!cancelled) setItems(workoutOverview(plan, events, state))
      })
      // Without events, the plan order and the current pointer still tell
      // most of the story.
      .catch(() => {
        if (!cancelled) setItems(workoutOverview(plan, [], state))
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, plan, state])

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Workout overview"
      >
        <p className="text-center text-lg font-bold">This workout</p>
        <ol className="space-y-2">
          {(items ?? workoutOverview(plan, [], state)).map((item) => {
            const badge = BADGE[item.status]
            const content = exerciseById.get(item.exerciseId)
            return (
              <li
                key={item.index}
                aria-current={item.status === 'current' ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-panel border px-3 py-2 ${
                  item.status === 'current' ? 'border-primary bg-field-primary' : 'border-[var(--color-border)]'
                } ${item.status === 'skipped' ? 'opacity-70' : ''}`}
              >
                <ExerciseThumb exercise={content ?? { id: item.exerciseId, mediaManifest: {} }} className="h-11 w-11 rounded-control" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${item.status === 'skipped' ? 'line-through' : ''}`}>{item.name}</p>
                  <p className="text-sm text-ink-muted">
                    {item.doneSets} of {item.plannedSets} {item.plannedSets === 1 ? 'set' : 'sets'}
                  </p>
                </div>
                {badge && (
                  <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                    {item.status === 'done' && <span aria-hidden="true">✓ </span>}
                    {badge.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <button ref={closeRef} type="button" className="btn-primary btn-lg w-full" onClick={onClose}>
          Back to the workout
        </button>
      </div>
    </div>
  )
}
