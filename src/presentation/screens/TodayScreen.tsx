import { DRAFT_TEMPLATE_IDS } from '../../domain/content/fixtures/raeDraftTemplates'
import { DraftTag } from '../components/DraftTag'
import { countLabel } from '../format'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROTATION, foundationStrengthStarterTemplates } from '../../domain/content/fixtures/foundationStrengthStarter'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import { getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { getCurrentState, settleOpenSessions } from '../../application/sessionService'
import { ResumeActions } from '../components/ResumeActions'
import { listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { db } from '../../infrastructure/db/schema'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'
import { WEEKDAY_LABELS, resolveToday, type Weekday } from '../../domain/schedule/weeklySchedule'
import { buildWeek, setsDone, todayMode, workoutsToday, type WeekDay } from '../../domain/schedule/todayView'
import { WelcomeCard } from '../components/WelcomeCard'
import { RaeHero } from '../components/RaeHero'
import { TodayMission, type Mission } from '../components/TodayMission'
import { WeekBlooms, type WeekNames } from '../components/WeekBlooms'
import { PlanWeekCard } from '../components/PlanWeekCard'
import { RecapEntry } from '../components/RecapEntry'
import { shouldOfferPlanWeek } from '../../domain/schedule/planWeek'
import { bloomStreakLabel, calculateWeekStreak, nextMilestone, weeklyGoal, weekProgress } from '../../domain/progress/stats'
import { buildGarden, GARDEN_SPECIES, type GardenFlower } from '../../domain/progress/garden'
import { computeXp, levelFor } from '../../domain/progress/xp'
import { MomentumStrip, useMomentumEntrance } from '../components/TodayMomentum'
import { dayPart, greeting, hasRealName, longDate } from '../greeting'
import { raeSays } from '../raeSays'
import { activeProfile } from '../../infrastructure/profiles'
import { raeStillFor } from '../components/raeLoops'
import { estimateMinutes } from '../../domain/content/workoutEstimate'
import { PixelBloom } from '../components/PixelBloom'

const QUICK_ID = 'fs.quick-10'

function describe(template: WorkoutTemplate): string {
  return `${countLabel(template.exercises.length, 'exercise')}, about ${estimateMinutes(template)} min`
}

type TodayData = {
  mission: Mission
  week: WeekDay[]
  weekNames: WeekNames
  // Workouts this week should reach (weeklyGoal: planned days, or 2).
  weekGoal: number
  // Everything you could start instead, primary pick excluded.
  others: { template: WorkoutTemplate; custom: boolean }[]
  // Any workout ever finished on this profile (retires the welcome card).
  hasFinished: boolean
  // The open workout offered for resume, if any.
  resumeId: string | null
  // No day planned yet, after the first workout (shouldOfferPlanWeek).
  offerPlanWeek: boolean
  // Toward the next workout milestone (nextMilestone), null before the first.
  milestone: ReturnType<typeof nextMilestone>
  // Weeks in a row meeting the goal as a chip label (bloomStreakLabel), or null.
  bloomStreak: string | null
  // What Rae says in her room (raeSays).
  raeLine: string
  // Every flower grown so far, oldest first; RaeHero shows the newest few.
  gardenFlowers: GardenFlower[]
  // Bloom level (xp.ts), used by RaeHero to grow her room's decor.
  level: number
}

async function loadToday(now: Date): Promise<TodayData> {
  // First, so a workout abandoned long ago is finished (at its last action)
  // before history is read: it counts, and never blocks today.
  const resumable = await settleOpenSessions(now)
  const [results, schedule, custom, plans, events] = await Promise.all([
    db.sessionResults.toArray(),
    getWeeklySchedule(),
    listCustomTemplates(),
    db.sessionPlans.toArray(),
    db.sessionEvents.toArray(),
  ])

  // A/B rotation: the template after the most recent curated one.
  let suggestion = ROTATION[0]
  for (const result of [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))) {
    const plan = await getPlan(result.planId)
    const index = plan ? ROTATION.indexOf(plan.templateId) : -1
    if (index >= 0) {
      suggestion = ROTATION[(index + 1) % ROTATION.length]
      break
    }
  }

  const resolution = resolveToday(schedule, now, suggestion)
  const scheduled = resolution.kind === 'scheduled' ? await getTemplate(resolution.templateId) : undefined
  // A scheduled routine that no longer exists (deleted custom) falls back to rotation.
  const primaryId = scheduled?.id ?? suggestion
  const primary = (await getTemplate(primaryId)) ?? foundationStrengthStarterTemplates[0]
  const weekday = WEEKDAY_LABELS[now.getDay() as Weekday]
  const today = workoutsToday(results, now)
  const quick = await getTemplate(QUICK_ID)
  const extra = quick && quick.id !== primary.id ? { name: quick.name, to: `/checkin/${quick.id}` } : null

  const mode = todayMode({
    inProgress: resumable != null,
    doneToday: today.length > 0,
    restToday: resolution.kind === 'rest',
  })

  let mission: Mission
  if (mode === 'resume' && resumable) {
    const plan = resumable
    const state = await getCurrentState(plan.id)
    const { done, total } = setsDone(plan, state)
    mission = {
      kind: 'resume',
      name: (await getTemplate(plan.templateId))?.name ?? 'Your workout',
      current: plan.exercises[state.currentExerciseIndex]?.name ?? 'your last set',
      done,
      total,
      to: `/session/${plan.id}`,
    }
  } else if (mode === 'done') {
    const latest = today[0]
    const plan = await getPlan(latest.planId)
    const minutes = Math.max(1, Math.round((Date.parse(latest.endedAt) - Date.parse(latest.startedAt)) / 60000))
    const count = today.length > 1 ? `, ${today.length} workouts today` : ''
    mission = {
      kind: 'done',
      name: (plan && (await getTemplate(plan.templateId))?.name) ?? 'Workout',
      detail: `${latest.totalSetsCompleted} sets in ${minutes} min${count}`,
      extra,
    }
  } else if (mode === 'rest') {
    mission = { kind: 'rest', extra }
  } else {
    // Thumbnails only: a custom routine's library chunk may not be cached
    // offline yet, and that must not blank Today.
    const exercises = await getExercises(primary.exercises.map((e) => e.exerciseId)).catch(
      () => new Map<string, Exercise>()
    )
    mission = {
      kind: 'ready',
      tag: scheduled ? weekday : 'Up next',
      name: primary.name,
      detail: describe(primary),
      thumbs: primary.exercises.flatMap((e) => {
        const exercise = exercises.get(e.exerciseId)
        // Rae doing the move when she has it, the photo otherwise.
        const rae = raeStillFor(e.exerciseId)
        const src = rae?.src ?? exercise?.mediaManifest.start
        return src && exercise ? [{ src, alt: exercise.name, rae: rae != null }] : []
      }),
      to: `/checkin/${primary.id}`,
    }
  }

  // While a workout is ready, its own card is the mission; in every other
  // state all routines stay one tap away below.
  const hideId = mode === 'ready' ? primary.id : null
  const others = [
    ...foundationStrengthStarterTemplates.map((template) => ({ template, custom: false })),
    ...custom.map((template) => ({ template, custom: true })),
  ].filter(({ template }) => template.id !== hideId)

  // Names for the week's pots: what was done each day (via its plan) and
  // what is planned. This week only, so a handful of plan reads.
  const week = buildWeek(results, schedule, now)
  const templateNames: Record<string, string> = {}
  for (const t of [...foundationStrengthStarterTemplates, ...custom]) templateNames[t.id] = t.name
  const sessionNames: Record<string, string> = {}
  for (const s of week.flatMap((d) => d.sessions)) {
    const plan = await getPlan(s.planId)
    if (plan) sessionNames[s.sessionId] = templateNames[plan.templateId] ?? (await getTemplate(plan.templateId))?.name ?? 'Workout'
  }

  return {
    mission,
    week,
    weekNames: { sessions: sessionNames, templates: templateNames },
    weekGoal: weeklyGoal(schedule),
    milestone: nextMilestone(results.length),
    bloomStreak: bloomStreakLabel(calculateWeekStreak(results, weeklyGoal(schedule), now)),
    others,
    hasFinished: results.length > 0,
    resumeId: mode === 'resume' ? (resumable?.id ?? null) : null,
    offerPlanWeek: shouldOfferPlanWeek(results.length > 0, schedule),
    raeLine: raeSays({
      mode,
      hasFinished: results.length > 0,
      daysSinceLast: daysSinceLast(results, now),
      goalMet: weekProgress(results, schedule, now).met,
      part: dayPart(now),
      dateKey: localDateKey(now),
    }),
    gardenFlowers: buildGarden(results).flowers,
    level: levelFor(computeXp({ plans, results, events }, weeklyGoal(schedule)).total).level,
  }
}

// Whole local calendar days since the last finished workout (0 = today).
function daysSinceLast(results: readonly { endedAt: string }[], now: Date): number | null {
  if (results.length === 0) return null
  const last = new Date(Math.max(...results.map((r) => Date.parse(r.endedAt))))
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((startOf(now) - startOf(last)) / 86_400_000)
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Home-screen apps stay alive in the background for days, so "now" is
// refreshed whenever Today comes back into view and just after midnight.
function useNow(): [Date, () => void] {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', refresh)
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
    const timer = window.setTimeout(() => setNow(new Date()), tomorrow.getTime() - now.getTime())
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.clearTimeout(timer)
    }
  }, [now])
  return [now, () => setNow(new Date())]
}

export function TodayScreen() {
  const [profile, setProfile] = useState(() => activeProfile())
  const [now, refreshNow] = useNow()
  const [data, setData] = useState<TodayData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const momentumIn = useMomentumEntrance(localDateKey(now))
  const emblemSpecies = profile.emblem ? GARDEN_SPECIES.find((s) => s.id === profile.emblem) ?? null : null

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    loadToday(now)
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [now, attempt])

  return (
    <div className="p-4 space-y-4">
      <header className="px-1">
        <p className="text-sm font-semibold text-ink-muted">{longDate(now)}</p>
        <h1 className="flex items-center gap-1.5 text-[1.625rem] font-extrabold leading-tight">
          <span>{greeting(now, profile.name)}</span>
          {emblemSpecies && hasRealName(profile.name) && (
            <span aria-hidden="true" className="inline-flex flex-none">
              <PixelBloom size={22} animate={false} species={emblemSpecies} />
            </span>
          )}
        </h1>
      </header>

      {/* Rae's room with today's one thing to do joined underneath it, so
          the stage reads as her presenting it. */}
      <section className="today-stage" aria-label="Today">
        <RaeHero part={dayPart(now)} says={data?.raeLine} flowers={data?.gardenFlowers} level={data?.level ?? 1} />
        {data ? (
          <TodayMission
            mission={data.mission}
            resumeActions={
              data.resumeId ? <ResumeActions sessionId={data.resumeId} onDiscarded={refreshNow} /> : undefined
            }
          />
        ) : failed ? (
          <div className="today-mission bg-field-primary space-y-3 p-4 text-center">
            <p className="font-bold">Couldn't load today's workout.</p>
            <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </div>
        ) : (
          <div className="today-mission bg-field-primary h-40" />
        )}
      </section>

      <WelcomeCard finished={data ? data.hasFinished : null} onNamed={() => setProfile(activeProfile())} />

      {data && (
        <WeekBlooms
          week={data.week}
          goal={data.weekGoal}
          names={data.weekNames}
          animate={momentumIn}
          footer={<MomentumStrip milestone={data.milestone} streak={data.bloomStreak} animate={momentumIn} />}
        />
      )}

      {data && <RecapEntry />}

      {data?.offerPlanWeek && <PlanWeekCard />}

      {data && data.others.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-ink-muted">
            {data.mission.kind === 'ready' ? 'Or pick another' : 'Workouts'}
          </h2>
          <ul className="card divide-y-2 divide-[var(--color-border)] overflow-hidden">
            {data.others.map(({ template, custom }) => (
              <li key={template.id}>
                <Link to={`/checkin/${template.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-field-primary">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {template.name}
                      {DRAFT_TEMPLATE_IDS.has(template.id) && <DraftTag />}
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {custom ? 'Your routine, ' : ''}
                      {describe(template)}
                    </span>
                  </span>
                  <span className="text-xl text-ink-muted" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
