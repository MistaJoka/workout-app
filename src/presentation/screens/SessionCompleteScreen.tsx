import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPlan, getResult } from '../../infrastructure/db/repositories/sessionRepository'
import {
  advanceProgression,
  dismissProgressionCandidate,
  getProgression,
} from '../../infrastructure/db/repositories/familiarityProgressionRepository'
import type { SessionResult } from '../../domain/session/types'
import { formatWeight } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { ThumbBar } from '../components/ThumbBar'
import { RaeFace } from '../components/Rae'

type Candidate = {
  exerciseId: string
  exerciseName: string
  detail: string
  candidatePrescribedReps: number
  candidateWeightKg?: number
}

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null)
  const [unit] = useWeightUnit()

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
        candidatePrescribedReps: r.pendingCandidate!.candidatePrescribedReps,
        ...(r.pendingCandidate!.candidateWeightKg != null ? { candidateWeightKg: r.pendingCandidate!.candidateWeightKg } : {}),
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
    <div className="field-success min-h-screen rounded-none p-6 pt-16 pb-28 text-center space-y-4">
      <RaeFace expression="cheer" size={120} motion="pop" className="mx-auto" />
      <p className="text-3xl font-extrabold">Workout complete</p>
      {result && (
        <p className="text-ink-muted">
          {result.totalSetsCompleted} of {result.totalSetsPlanned} sets completed
          {result.status === 'COMPLETED_SHORTENED' ? ' (ended early)' : ''}
        </p>
      )}

      {candidates.length > 0 && (
        <div className="space-y-3 text-left">
          {candidates.map((candidate) => (
            <div key={candidate.exerciseId} className="card p-4 space-y-2">
              <p className="font-semibold">Try Next Level? {candidate.exerciseName}</p>
              <p className="text-sm text-ink-muted">{candidate.detail}</p>
              <p className="text-sm">
                Next: {candidate.candidatePrescribedReps} reps
                {candidate.candidateWeightKg != null ? ` @ ${formatWeight(candidate.candidateWeightKg, unit)}` : ''}
              </p>
              <div className="flex justify-center gap-2">
                <button
                  className="btn-primary"
                  disabled={busyExerciseId === candidate.exerciseId}
                  onClick={() => handleConfirm(candidate.exerciseId)}
                >
                  Yes, try it
                </button>
                <button
                  className="btn-secondary"
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

      {/* ThumbBar ignores taps briefly: this button sits where the player's
          last "Yes"/"Complete Set" was, so a double tap on the final set
          would skip straight past this screen and any Try Next Level offer. */}
      <ThumbBar armKey="complete">
        <Link to="/" className="btn-primary btn-lg w-full">
          Back to Today
        </Link>
      </ThumbBar>
    </div>
  )
}
