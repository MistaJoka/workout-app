import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPlan, getResult } from '../../infrastructure/db/repositories/sessionRepository'
import {
  advanceProgression,
  dismissProgressionCandidate,
  getProgression,
} from '../../infrastructure/db/repositories/familiarityProgressionRepository'
import type { SessionResult } from '../../domain/session/types'

type Candidate = {
  exerciseId: string
  exerciseName: string
  detail: string
}

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getResult(sessionId).then((loaded) => setResult(loaded ?? null))
    loadCandidates(sessionId).then(setCandidates)
  }, [sessionId])

  async function loadCandidates(id: string): Promise<Candidate[]> {
    const plan = await getPlan(id)
    if (!plan) return []
    const progressionRecords = await Promise.all(plan.exercises.map((e) => getProgression(e.exerciseId)))
    return progressionRecords
      .filter((r) => r.pendingCandidate)
      .map((r) => ({
        exerciseId: r.exerciseId,
        exerciseName: plan.exercises.find((e) => e.exerciseId === r.exerciseId)?.name ?? r.exerciseId,
        detail: r.pendingCandidate!.detail,
      }))
  }

  async function handleConfirm(exerciseId: string) {
    setBusyExerciseId(exerciseId)
    await advanceProgression(exerciseId, new Date().toISOString())
    setCandidates((current) => current.filter((c) => c.exerciseId !== exerciseId))
    setBusyExerciseId(null)
  }

  async function handleDismiss(exerciseId: string) {
    setBusyExerciseId(exerciseId)
    await dismissProgressionCandidate(exerciseId)
    setCandidates((current) => current.filter((c) => c.exerciseId !== exerciseId))
    setBusyExerciseId(null)
  }

  return (
    <div className="p-6 text-center space-y-4">
      <p className="text-xl font-semibold">Workout complete</p>
      {result && (
        <p className="text-ink-muted">
          {result.totalSetsCompleted} of {result.totalSetsPlanned} sets completed
          {result.status === 'COMPLETED_SHORTENED' ? ' (ended early)' : ''}
        </p>
      )}

      {candidates.length > 0 && (
        <div className="space-y-3 text-left">
          {candidates.map((candidate) => (
            <div key={candidate.exerciseId} className="rounded-panel border border-edge bg-surface p-4 space-y-2">
              <p className="font-semibold">Try Next Level? {candidate.exerciseName}</p>
              <p className="text-sm text-ink-muted">{candidate.detail}</p>
              <div className="flex justify-center gap-2">
                <button
                  className="rounded-panel bg-primary px-4 py-2 text-white"
                  disabled={busyExerciseId === candidate.exerciseId}
                  onClick={() => handleConfirm(candidate.exerciseId)}
                >
                  Yes, try it
                </button>
                <button
                  className="rounded-panel border border-edge px-4 py-2"
                  disabled={busyExerciseId === candidate.exerciseId}
                  onClick={() => handleDismiss(candidate.exerciseId)}
                >
                  Not yet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/" className="inline-block rounded-panel bg-primary px-4 py-2 text-white">
        Back to Today
      </Link>
    </div>
  )
}
