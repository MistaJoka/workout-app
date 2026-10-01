import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShareWorkoutButton } from '../components/ShareWorkoutButton'
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
import { CompleteHighlights } from '../components/CompleteHighlights'
import { AchievementUnlocks } from '../components/AchievementUnlocks'
import { PerfectStamp } from '../components/PerfectStamp'
import { NextUpTeaser } from '../components/NextUpTeaser'
import { GoalMetBanner, LevelUpMoment, XpGainChip, loadSessionXp } from '../components/XpCelebration'
import type { SessionXpGain } from '../../domain/progress/xp'
import { BloomReveal } from '../components/BloomReveal'
import { useCountUp } from '../components/CountUp'
import { sessionBloom, type GardenSpecies } from '../../domain/progress/garden'
import { db } from '../../infrastructure/db/schema'
import { bookendsFor } from '../../domain/content/workoutEstimate'
import { templateById } from '../../domain/content/fixtures/foundationStrengthStarter'
import type { WorkoutTemplate } from '../../domain/content/types'

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
  const [coolDown, setCoolDown] = useState<WorkoutTemplate | undefined>(undefined)
  // This workout's garden flower. `undefined` while it loads, so the flower
  // waits and grows once in its own colours instead of switching mid-bloom;
  // `null` if it couldn't be read (the default pink bloom grows instead).
  const [bloom, setBloom] = useState<{ species: GardenSpecies; isNew: boolean } | null | undefined>(undefined)
  // Bloom XP this workout earned (and whether it crossed a level or met the
  // week's goal). Null until read, or if it can't be: the screen never waits.
  const [xp, setXp] = useState<SessionXpGain | null>(null)

  useEffect(() => {
    if (!sessionId) return
    // Best effort: the finish screen itself never depends on these reads.
    getResult(sessionId)
      .then((loaded) => setResult(loaded ?? null))
      .catch(() => setResult(null))
    db.sessionResults
      .toArray()
      .then((all) => setBloom(sessionBloom(all, sessionId)))
      .catch(() => setBloom(null))
    loadStats(sessionId)
      .then(setStats)
      .catch(() => setStats(null))
    loadSessionXp(sessionId)
      .then((gain) => setXp(gain.gained > 0 ? gain : null))
      .catch(() => setXp(null))
    loadCandidates(sessionId)
      .then(setCandidates)
      .catch(() => setCandidates([]))
    // After a main workout, offer the optional cool-down (never after the
    // warm-up or cool-down themselves).
    getPlan(sessionId)
      .then((plan) => setCoolDown(plan ? bookendsFor(plan.templateId, (id) => templateById.get(id)).coolDown : undefined))
      .catch(() => setCoolDown(undefined))
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

  const shortened = result?.status === 'COMPLETED_SHORTENED'

  return (
    <div className="field-success min-h-screen rounded-none p-6 pt-16 pb-28 text-center space-y-4">
      {/* Hero: Rae cheers beside this week's new flower (grows in as the
          screen opens, static under reduced/off motion), the headline, and
          this workout's species chip. The chip's own "new to your garden"
          note and the week-bloom caption are one grouped line here, not
          scattered text lower on the screen. */}
      <div className="mx-auto flex max-w-xs items-end justify-center gap-3" data-testid="complete-celebration">
        <RaeFace expression="cheer" size={112} motion="pop" />
        <div className="flex flex-col items-center">
          <PixelBloom
            bloomed={result !== null && bloom !== undefined}
            size={100}
            species={bloom?.species}
            label={bloom ? `This week's new flower, in bloom: ${bloom.species.name}` : "This week's new flower, in bloom"}
          />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto -mt-4 h-2 max-w-[15rem] rounded-full bg-[#e9c6a9]" />
      <p className="text-3xl font-extrabold">Workout complete</p>
      {result && bloom && <BloomReveal species={bloom.species} isNew={bloom.isNew} />}
      {result && (
        // Ties the finish to Today's week: every finished workout grows a
        // flower there (WeekBlooms), ended-early ones included. Sits right
        // under the chip above instead of as a separate block lower down.
        <p className="mx-auto max-w-xs text-center text-sm font-semibold text-ink-muted">
          {shortened ? 'You showed up, and that counts.' : 'A new flower just bloomed in your week!'}
        </p>
      )}

      {stats && result && (
        <div className="mx-auto flex max-w-sm gap-2">
          <Stat value={stats.minutes} label={stats.minutes === 1 ? 'minute' : 'minutes'} />
          <SetsStat completed={result.totalSetsCompleted} planned={result.totalSetsPlanned} shortened={shortened} />
          <Stat value={stats.moves} label={stats.moves === 1 ? 'move' : 'moves'} />
        </div>
      )}

      {/* One rewards card: perfect stamp, XP + level (+ goal met), session
          highlights, and badge unlocks, each a staggered slot under full
          motion so the eye lands on one thing at a time instead of a dozen
          competing call-outs. The level-up overlay is a full-screen moment
          of its own and stays outside the card. */}
      {result && sessionId && (
        <section className="rewards-card card mx-auto max-w-sm space-y-3 p-4 text-left" aria-label="Rewards">
          <style>{REWARDS_STYLE}</style>
          <RewardItem delay={0}>
            <PerfectStamp sessionId={sessionId} />
          </RewardItem>
          {xp && (
            <RewardItem delay={90}>
              <XpGainChip gain={xp} />
              {xp.goalMet && <GoalMetBanner />}
            </RewardItem>
          )}
          <RewardItem delay={180}>
            <CompleteHighlights sessionId={sessionId} />
          </RewardItem>
          <RewardItem delay={270}>
            <AchievementUnlocks sessionId={sessionId} />
          </RewardItem>
        </section>
      )}
      {result && xp?.leveledUp && <LevelUpMoment to={xp.to} />}

      {/* The next-level offer is a decision, not a reward: it stays its own
          prominent block right after the rewards card. */}
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

      {result && <NextUpTeaser />}

      {/* Actions: Share and See your progress side by side, Cool down (when
          offered) as a compact card under them, backup last when it's due. */}
      {result && (
        <div className="mx-auto flex max-w-sm items-stretch justify-center gap-2">
          {sessionId && (
            <div className="flex flex-1 items-center justify-center">
              <ShareWorkoutButton sessionId={sessionId} />
            </div>
          )}
          <Link to="/progress" className="btn-ghost min-h-11 flex-1">
            See your progress
          </Link>
        </div>
      )}

      {coolDown && (
        <Link
          to={`/checkin/${coolDown.id}`}
          className="card mx-auto flex min-h-11 max-w-sm items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block font-semibold">Cool down</span>
            <span className="block text-sm text-ink-muted">{coolDown.exercises.length} moves</span>
          </span>
          <span aria-hidden="true" className="text-ink-muted">
            ›
          </span>
        </Link>
      )}

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
  const shown = useCountUp(value)
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p className="hud-num text-3xl font-bold" aria-label={String(value)}>
        {shown}
      </p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  )
}

// The sets tile, folding "N of M sets completed" into the stat row instead
// of a separate sentence under the hero. The numerator counts up like the
// other tiles; the denominator and "ended early" note are static.
function SetsStat({ completed, planned, shortened }: { completed: number; planned: number; shortened: boolean }) {
  const shown = useCountUp(completed)
  return (
    <div className="flex-1 field-info p-3 text-center">
      <p
        className="hud-num text-3xl font-bold"
        aria-label={`${completed} of ${planned} sets completed${shortened ? ' (ended early)' : ''}`}
      >
        {shown}/{planned}
      </p>
      <p className="text-xs text-ink-muted">{shortened ? 'sets (ended early)' : 'sets'}</p>
    </div>
  )
}

const REWARDS_STYLE = `
.rewards-item:empty { display: none; }
.rewards-item:not(:empty) ~ .rewards-item:not(:empty) { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); }
[data-motion='full'] .rewards-item:not(:empty) { animation: rewards-pop 280ms cubic-bezier(.2,.9,.3,1.1) both; }
@keyframes rewards-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
/* No reward actually landed (all slots empty): the card itself disappears
   rather than showing as a blank padded box. */
.rewards-card:not(:has(.rewards-item:not(:empty))) { display: none; }
`

// One slot in the rewards card. A slot whose children render nothing (a
// reward that didn't happen) collapses to nothing via :empty rather than
// leaving a gap or an empty separator line.
function RewardItem({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <div className="rewards-item" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
