import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEventsForSession, getPlan, getResult } from '../../infrastructure/db/repositories/sessionRepository'
import { completeStats, type CompleteStats } from './completeStats'
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
import { BackupNudge } from '../components/BackupNudge'
import { PixelBloom } from '../components/PixelBloom'

type Candidate = {
  exerciseId: string
  exerciseName: string
  candidatePrescribedReps: number
  candidateWeightKg?: number
}

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [stats, setStats] = useState<CompleteStats | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null)
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [unit] = useWeightUnit()

  useEffect(() => {
    if (!sessionId) return
    // Best effort: the finish screen itself never depends on these reads.
    getResult(sessionId)
      .then((loaded) => setResult(loaded ?? null))
      .catch(() => setResult(null))
    loadStats(sessionId)
      .then(setStats)
      .catch(() => setStats(null))
    loadCandidates(sessionId)
      .then(setCandidates)
      .catch(() => setCandidates([]))
  }, [sessionId])

  async function loadStats(id: string): Promise<CompleteStats | null> {
    const [plan, loaded, events] = await Promise.all([getPlan(id), getResult(id), getEventsForSession(id)])
    return plan && loaded ? completeStats(plan, loaded, events) : null
  }

  async function loadCandidates(id: string): Promise<Candidate[]> {
    const plan = await getPlan(id)
    if (!plan) return []
    const progressionRecords = await Promise.all(plan.exercises.map((e) => getProgression(e.exerciseId)))
    return progressionRecords
      .filter((r) => r.pendingCandidate)
      .map((r) => ({
        exerciseId: r.exerciseId,
        exerciseName: plan.exercises.find((e) => e.exerciseId === r.exerciseId)?.name ?? r.exerciseId,
        candidatePrescribedReps: r.pendingCandidate!.candidatePrescribedReps,
        ...(r.pendingCandidate!.candidateWeightKg != null ? { candidateWeightKg: r.pendingCandidate!.candidateWeightKg } : {}),
      }))
  }

  // A failed write keeps the offer on screen (it's still pending in the
  // database) with a retry-able message, instead of a stuck button.
  async function resolveCandidate(exerciseId: string, write: (id: string) => Promise<unknown>) {
    setBusyExerciseId(exerciseId)
    setCandidateError(null)
    try {
      await write(exerciseId)
      setCandidates((current) => current.filter((c) => c.exerciseId !== exerciseId))
    } catch {
      setCandidateError("Couldn't save on this device. Try again.")
    } finally {
      setBusyExerciseId(null)
    }
  }

  const handleConfirm = (exerciseId: string) =>
    resolveCandidate(exerciseId, (id) => advanceProgression(id, new Date().toISOString()))
  const handleDismiss = (exerciseId: string) => resolveCandidate(exerciseId, dismissProgressionCandidate)

  return (
    <div className="field-success min-h-screen rounded-none p-6 pt-16 pb-28 text-center space-y-4">
      {/* The moment: Rae cheers beside this week's new flower, which grows
          in as the screen opens (static when motion is reduced or off). */}
      <div className="mx-auto flex max-w-xs items-end justify-center gap-3" data-testid="complete-celebration">
        <RaeFace expression="cheer" size={112} motion="pop" />
        <div className="flex flex-col items-center">
          <PixelBloom bloomed={result !== null} size={100} label="This week's new flower, in bloom" />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto -mt-4 h-2 max-w-[15rem] rounded-full bg-[#e9c6a9]" />
      <p className="text-3xl font-extrabold">Workout complete</p>
      {result && (
        <p className="text-ink-muted">
          {result.totalSetsCompleted} of {result.totalSetsPlanned} sets completed
          {result.status === 'COMPLETED_SHORTENED' ? ' (ended early)' : ''}
        </p>
      )}
      {stats && (
        <div className="mx-auto flex max-w-sm gap-2">
          <Stat value={stats.minutes} label={stats.minutes === 1 ? 'minute' : 'minutes'} />
          <Stat value={stats.sets} label={stats.sets === 1 ? 'set' : 'sets'} />
          <Stat value={stats.moves} label={stats.moves === 1 ? 'move' : 'moves'} />
        </div>
      )}
      {result && (
        // Ties the finish to Today's week: every finished workout grows a
        // flower there (WeekBlooms), ended-early ones included.
        // Rae already cheers beside the flower above, so this is a caption,
        // not a second Rae.
        <p className="mx-auto max-w-xs text-center font-semibold">
          {result.status === 'COMPLETED_SHORTENED'
            ? 'You showed up, and that counts. A new flower is growing in your week.'
            : 'A new flower just bloomed in your week!'}
        </p>
      )}

      {candidates.length > 0 && (
        <div className="space-y-3 text-left">
          {candidates.map((candidate) => (
            <div key={candidate.exerciseId} className="card p-4 space-y-2">
              <p className="font-semibold">Try Next Level? {candidate.exerciseName}</p>
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
          {candidateError && <p className="text-sm text-center text-accent">{candidateError}</p>}
        </div>
      )}

      <Link to="/progress" className="btn-ghost min-h-11">
        See your progress
      </Link>

      {/* Shows only when a backup is due (14 days, or never with history),
          and not before the 3rd finished workout: a first finish stays a
          celebration. Settings asks from the first. */}
      <div className="w-full">
        <BackupNudge minFinished={3} />
      </div>

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

// Same tile as Progress's totals, on the mint finish field.
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p className="hud-num text-3xl font-bold">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}
