import { GoalGain } from '../components/GoalGain'
import { syncReminders } from '../../infrastructure/reminders'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShareWorkoutButton } from '../components/ShareWorkoutButton'
import { getPlan, getResult, listResults } from '../../infrastructure/db/repositories/sessionRepository'
import type { CompleteStats } from '../../domain/session/completeStats'
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
import { NotFound } from '../components/NotFound'
import { BackupNudge } from '../components/BackupNudge'
import { PixelBloom } from '../components/PixelBloom'
import { CompleteHighlights } from '../components/CompleteHighlights'
import { AchievementUnlocks } from '../components/AchievementUnlocks'
import { BossHitReward } from '../components/BossHitReward'
import { PerfectStamp } from '../components/PerfectStamp'
import { NextUpTeaser } from '../components/NextUpTeaser'
import { GoalMetBanner, LevelUpMoment, XpGainChip } from '../components/XpCelebration'
import { loadCompleteStats, loadGoalBloom, loadSessionXp } from '../../application/progressSnapshot'
import { loadProgressionOffers, type ProgressionOffer } from '../../application/progressionOffers'
import type { SessionXpGain } from '../../domain/progress/xp'
import { CarrotGainChip } from '../components/CarrotCelebration'
import { loadSessionCarrots } from '../../application/rewardsService'
import type { SessionCarrots } from '../../domain/rewards/carrots'
import { LoveNoteRewardItem } from '../components/LoveNoteCelebration'
import { BloomReveal } from '../components/BloomReveal'
import { useCountUp } from '../components/CountUp'
import { sessionBloom, type GardenSpecies } from '../../domain/progress/garden'
import { bookendsFor } from '../../domain/content/workoutEstimate'
import { templateById } from '../../domain/content/fixtures/foundationStrengthStarter'
import type { WorkoutTemplate } from '../../domain/content/types'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { useSheetFocus } from '../components/useSheetFocus'

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)
  const [stats, setStats] = useState<CompleteStats | null>(null)
  const [candidates, setCandidates] = useState<ProgressionOffer[]>([])
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
  // The bonus goal bloom this workout earned by reaching its week's goal
  // (goalBloom.ts), if any -- null while loading or if this isn't that
  // session.
  const [goalBloomSpecies, setGoalBloomSpecies] = useState<GardenSpecies | null>(null)
  // Carrots this workout earned (Hubby Bunny's reward shop), null while
  // loading or if it couldn't be read -- the screen never waits on it.
  const [carrots, setCarrots] = useState<SessionCarrots | null>(null)
  // True once the plan is known not to exist (a stale or made-up link):
  // there was no workout, so there's nothing to celebrate.
  const [missing, setMissing] = useState(false)
  // The rewards sheet: every reward moment that landed (badges, boss hit,
  // love note, bests...) behind one "+N rewards" button, so the finish
  // fits one screen. Its slots mount with the screen, hidden, so each
  // plays its sound once on arrival and pops in when the sheet opens.
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const rewardsRef = useRef<HTMLDivElement>(null)
  const rewardCount = useFilledSlots(rewardsRef)
  useSheetFocus(rewardsRef, () => setRewardsOpen(false), { enabled: rewardsOpen })

  useEffect(() => {
    if (!sessionId) return
    // Today is done: drop today's reminder if it hasn't fired yet.
    void syncReminders().catch(() => undefined)
    // Best effort: the finish screen itself never depends on these reads.
    getResult(sessionId)
      .then((loaded) => setResult(loaded ?? null))
      .catch(() => setResult(null))
    listResults()
      .then((all) => setBloom(sessionBloom(all, sessionId)))
      .catch(() => setBloom(null))
    loadGoalBloom(sessionId)
      .then(setGoalBloomSpecies)
      .catch(() => setGoalBloomSpecies(null))
    loadCompleteStats(sessionId)
      .then(setStats)
      .catch(() => setStats(null))
    loadSessionXp(sessionId)
      .then((gain) => setXp(gain.gained > 0 ? gain : null))
      .catch(() => setXp(null))
    loadProgressionOffers(sessionId)
      .then(setCandidates)
      .catch(() => setCandidates([]))
    loadSessionCarrots(sessionId)
      .then(setCarrots)
      .catch(() => setCarrots(null))
    // After a main workout, offer the optional cool-down (never after the
    // warm-up or cool-down themselves).
    getPlan(sessionId)
      .then((plan) => {
        setMissing(!plan)
        setCoolDown(plan ? bookendsFor(plan.templateId, (id) => templateById.get(id)).coolDown : undefined)
      })
      .catch(() => setCoolDown(undefined))
  }, [sessionId])

  // A failed write keeps the offer on screen (it's still pending in the
  // database) with a retry-able message, instead of a stuck button.
  async function resolveCandidate(exerciseId: string, write: (id: string) => Promise<unknown>) {
    setBusyExerciseId(exerciseId)
    setCandidateError(null)
    try {
      await write(exerciseId)
      setCandidates((current) => current.filter((c) => c.exerciseId !== exerciseId))
    } catch (err) {
      setCandidateError(storageErrorMessage(err, 'save'))
    } finally {
      setBusyExerciseId(null)
    }
  }

  const handleConfirm = (exerciseId: string) =>
    resolveCandidate(exerciseId, (id) => advanceProgression(id, new Date().toISOString()))
  const handleDismiss = (exerciseId: string) => resolveCandidate(exerciseId, dismissProgressionCandidate)

  const shortened = result?.status === 'COMPLETED_SHORTENED'

  if (missing) return <NotFound message="That workout isn't in your history." />

  // One secondary action under the hero: the cool-down when it's offered
  // (it's the next thing to do), else Share. The other lives in the sheet.
  const shareInSheet = Boolean(coolDown)

  return (
    <div className="field-success min-h-screen rounded-none px-6 pt-10 pb-28 text-center space-y-3">
      {/* Hero: Rae cheers beside this week's new flower (grows in as the
          screen opens, static under reduced/off motion), the headline, and
          this workout's species chip. */}
      <div className="mx-auto flex max-w-xs items-end justify-center gap-3" data-testid="complete-celebration">
        <RaeFace expression="cheer" size={96} motion="pop" />
        <div className="flex flex-col items-center">
          <PixelBloom
            bloomed={result !== null && bloom !== undefined}
            size={88}
            species={bloom?.species}
            label={bloom ? `This week's new flower, in bloom: ${bloom.species.name}` : "This week's new flower, in bloom"}
          />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto -mt-3 h-2 max-w-[13rem] rounded-full bg-[#e9c6a9]" />
      <p className="text-3xl font-extrabold">Workout complete</p>
      {result && bloom && <BloomReveal species={bloom.species} isNew={bloom.isNew} />}
      {result && (
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

      {/* The one reward row: XP, carrots and the level bar. */}
      {result && (xp || carrots) && (
        <section className="card mx-auto max-w-sm p-3 text-left" aria-label="Earned">
          {xp ? (
            <XpGainChip gain={xp} alongside={carrots ? <CarrotGainChip gain={carrots} inline /> : undefined} />
          ) : (
            carrots && <CarrotGainChip gain={carrots} />
          )}
        </section>
      )}
      {result && xp?.leveledUp && <LevelUpMoment to={xp.to} />}

      {/* The next-level offer is a decision, not a reward: it stays on the
          screen, prominent, never folded into the sheet. */}
      {candidates.length > 0 && (
        <div className="mx-auto max-w-sm space-y-3 text-left">
          {candidates.map((candidate) => (
            <div key={candidate.exerciseId} className="card space-y-2 border-[var(--color-primary)] p-4">
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

      {/* The rewards button and the one secondary action, side by side. */}
      {result && (
        <div className="mx-auto flex max-w-sm items-stretch gap-2">
          <button
            type="button"
            className={`btn-secondary ${rewardCount > 0 ? 'bg-field-notice' : ''} min-h-11 flex-1 gap-2`}
            onClick={() => setRewardsOpen(true)}
            aria-haspopup="dialog"
            data-testid="complete-more"
          >
            {rewardCount > 0 && <GiftBoxIcon />}
            {rewardCount > 0 ? `+${rewardCount} ${rewardCount === 1 ? 'reward' : 'rewards'}` : 'More'}
          </button>
          {coolDown ? (
            <Link
              to={`/checkin/${coolDown.id}`}
              className="card flex min-h-11 flex-1 items-center justify-between gap-2 px-3 py-2 text-left"
              aria-label={`Cool down, ${coolDown.exercises.length} moves`}
            >
              <span className="font-semibold">Cool down</span>
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
            </Link>
          ) : (
            sessionId && (
              <div className="flex flex-1 items-center justify-center">
                <ShareWorkoutButton sessionId={sessionId} />
              </div>
            )
          )}
        </div>
      )}

      {/* Shows only when a backup is due (14 days, or never with history),
          and not before the 3rd finished workout: a first finish stays a
          celebration. Settings asks from the first. */}
      <div className="w-full">
        <BackupNudge minFinished={3} />
      </div>

      {/* Always mounted (hidden while closed): see rewardsOpen above. */}
      {result && sessionId && (
        <div
          className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40"
          style={rewardsOpen ? undefined : { display: 'none' }}
          onClick={() => setRewardsOpen(false)}
        >
          <div
            ref={rewardsRef}
            className="app-column mx-auto max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4 text-left"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Your rewards"
          >
            <p className="text-center text-lg font-bold">Rewards</p>
            <section className="rewards-card space-y-3" aria-label="Rewards">
              <style>{REWARDS_STYLE}</style>
              <RewardItem delay={0} className="text-center">
                <PerfectStamp sessionId={sessionId} />
              </RewardItem>
              <RewardItem delay={60}>
                {xp?.goalMet && <GoalMetBanner />}
                {xp?.goalMet && goalBloomSpecies && <GoalBloomReveal species={goalBloomSpecies} />}
              </RewardItem>
              <RewardItem delay={120}>
                <CompleteHighlights sessionId={sessionId} />
              </RewardItem>
              <RewardItem delay={180}>
                <AchievementUnlocks sessionId={sessionId} />
              </RewardItem>
              <RewardItem delay={240}>
                <BossHitReward sessionId={sessionId} />
              </RewardItem>
              <RewardItem delay={300}>
                <LoveNoteRewardItem sessionId={sessionId} />
              </RewardItem>
              {carrots && (
                <RewardItem delay={360}>
                  <GoalGain gain={carrots.total} />
                </RewardItem>
              )}
            </section>
            <div className="text-center">
              <NextUpTeaser />
            </div>
            <div className="flex items-stretch gap-2 pt-1">
              {shareInSheet && (
                <div className="flex flex-1 items-center justify-center">
                  <ShareWorkoutButton sessionId={sessionId} />
                </div>
              )}
              {/* replace: Back from Progress never lands on this finished
                  screen again (Complete leaves history). */}
              <Link to="/progress" replace className="btn-ghost min-h-11 flex-1">
                See your progress
              </Link>
            </div>
            <button type="button" className="btn-secondary w-full" onClick={() => setRewardsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ThumbBar ignores taps briefly: this button sits where the player's
          last "Yes"/"Complete Set" was, so a double tap on the final set
          would skip straight past this screen and any Try Next Level offer. */}
      <ThumbBar armKey="complete">
        <Link to="/" replace className="btn-primary btn-lg w-full">
          Back to Today
        </Link>
      </ThumbBar>
    </div>
  )
}

// How many reward slots inside `ref` actually show something. The slots
// load themselves and render nothing when that reward didn't happen, so
// this watches the DOM rather than duplicating every slot's loading.
function useFilledSlots(ref: RefObject<HTMLElement | null>): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const recount = () => setCount(root.querySelectorAll('.rewards-item:not(:empty)').length)
    recount()
    const observer = new MutationObserver(recount)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  })
  return count
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

const GOAL_BLOOM_STYLE = `
.goal-bloom-reveal { animation: goal-bloom-pop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }
@keyframes goal-bloom-pop { from { opacity: 0; transform: scale(0.75); } to { opacity: 1; transform: scale(1); } }
[data-motion='reduced'] .goal-bloom-reveal, [data-motion='off'] .goal-bloom-reveal { animation: none; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .goal-bloom-reveal { animation: none; } }
`

// A small pixel gift box, drawn open at the lid -- the goal bloom's own
// decoration (aria-hidden; the real information is the text beside it).
function GiftBoxIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="22" height="22" shapeRendering="crispEdges">
      <rect x="1" y="5" width="10" height="6" fill="#f2b829" />
      <rect x="1" y="9" width="10" height="2" fill="#d99a1a" />
      <rect x="0" y="3" width="12" height="2" fill="#ff8fb8" />
      <rect x="5" y="3" width="2" height="8" fill="#e85a7c" />
      <rect x="3" y="0" width="2" height="3" fill="#ff8fb8" />
      <rect x="7" y="0" width="2" height="3" fill="#ff8fb8" />
      <rect x="4" y="1" width="1" height="1" fill="#ffb8d9" />
      <rect x="8" y="1" width="1" height="1" fill="#ffb8d9" />
    </svg>
  )
}

// The bonus flower a met weekly goal earns, revealed right alongside the
// "Goal met!" banner once this exact workout is the one that reached the
// goal (goalBloom.ts). A gift-box pop under full motion; reduced/off motion
// skip straight to the end state, same convention as every other Pixel
// Bloom entrance (BloomReveal.tsx, LoreSheet.tsx).
function GoalBloomReveal({ species }: { species: GardenSpecies }) {
  const article = /^[aeiou]/i.test(species.name) ? 'An' : 'A'
  return (
    <div
      className="goal-bloom-reveal mt-2 flex items-center justify-center gap-2 text-center"
      role="status"
      data-testid="goal-bloom-reveal"
    >
      <style>{GOAL_BLOOM_STYLE}</style>
      <GiftBoxIcon />
      <p className="text-sm font-bold">
        Goal bloom! {article} {species.name} for your week
      </p>
    </div>
  )
}

const REWARDS_STYLE = `
.rewards-item:empty { display: none; }
.rewards-item:not(:empty) ~ .rewards-item:not(:empty) { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); }
[data-motion='full'] .rewards-item:not(:empty) { animation: rewards-pop 280ms cubic-bezier(.2,.9,.3,1.1) both; }
@keyframes rewards-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`

// One slot in the rewards card. A slot whose children render nothing (a
// reward that didn't happen) collapses to nothing via :empty rather than
// leaving a gap or an empty separator line.
function RewardItem({ delay, className = '', children }: { delay: number; className?: string; children: ReactNode }) {
  return (
    <div className={`rewards-item ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
