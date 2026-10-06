import { listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { SAVING_FOR_KEY, savingGoalReward } from '../components/SavingGoal'
import { loadCarrotBalance } from '../components/CarrotCelebration'
import { weeklyForecast } from '../../domain/rewards/pricing'
import { useEffect, useState } from 'react'
import { listAllTemplates } from '../../domain/content/catalog'
import type { WorkoutTemplate } from '../../domain/content/types'
import { buildScheduleIcs } from '../../domain/schedule/calendarExport'
import {
  EMPTY_SCHEDULE,
  WEEKDAY_LABELS,
  isScheduleSet,
  pruneSchedule,
  type DayPlan,
  type WeeklySchedule,
} from '../../domain/schedule/weeklySchedule'
import { getWeeklySchedule, saveWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
import { weeklyGoal } from '../../domain/progress/stats'
import { mondayKey } from '../../domain/progress/weekGoals'
import { db } from '../../infrastructure/db/schema'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import { REMINDER_TIMES, ReminderCard } from '../components/ReminderCard'
import { remindersSupported, syncReminders } from '../../infrastructure/reminders'
import { shareOrDownload } from '../components/shareOrDownload'
import { Skeleton, SkeletonBlock, SkeletonList } from '../components/Skeleton'

// Monday-first rows; the schedule itself is keyed by JS weekday (0 = Sunday).
const ROW_ORDER: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0]

export function ScheduleScreen() {
  const [openDay, setOpenDay] = useState<keyof WeeklySchedule | null>(null)
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState(REMINDER_TIMES[2])
  const [calendarNote, setCalendarNote] = useState<string | null>(null)
  // The goal this week already started with (it holds until Monday, so a
  // change here can't re-score anything earned: domain/progress/weekGoals.ts).
  const [thisWeekGoal, setThisWeekGoal] = useState<number | null>(null)
  // The reward she's saving for and how many carrots it still needs: the
  // week's worth toward it shows under the days.
  const [savingGoal, setSavingGoal] = useState<{ title: string; remaining: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)
    Promise.all([getWeeklySchedule(), listAllTemplates()])
      .then(async ([stored, { curated, custom, herMix }]) => {
        if (cancelled) return
        // Her mix can be planned like any routine; once she has fewer than
        // three hearts it's gone, and its days are pruned like a deleted one.
        const all = [...curated, ...custom, ...(herMix ? [herMix] : [])]
        const loaded = stored ?? { ...EMPTY_SCHEDULE }
        // A routine deleted elsewhere leaves its id behind; clear it so the
        // day reads "Not planned" and Today stops pointing at it.
        const pruned = pruneSchedule(loaded, new Set(all.map((t) => t.id)))
        if (pruned !== loaded) await saveWeeklySchedule(pruned).catch(() => undefined)
        setTemplates(all)
        setSchedule(pruned)
        // Only once this week has a workout is its goal fixed; before that a
        // change applies right away and there's nothing to say.
        const results = await db.sessionResults.toArray().catch(() => [])
        const now = new Date()
        const startedThisWeek = results.some((r) => mondayKey(new Date(r.endedAt)) === mondayKey(now))
        const goals = startedThisWeek ? await loadWeekGoals({ results, schedule: pruned }).catch(() => null) : null
        if (!cancelled && goals) setThisWeekGoal(goals(now))
        const [rewards, savingFor, balance] = await Promise.all([
          listRewards().catch(() => []),
          getSetting<string | null>(SAVING_FOR_KEY).catch(() => null),
          loadCarrotBalance().catch(() => null),
        ])
        const goalReward = savingGoalReward(rewards, savingFor)
        if (!cancelled && goalReward && balance != null) {
          setSavingGoal({ title: goalReward.title, remaining: Math.max(0, goalReward.cost - balance) })
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function set(day: keyof WeeklySchedule, plan: DayPlan | null) {
    if (!schedule) return
    const previous = schedule
    const next = { ...schedule, [day]: plan }
    setSchedule(next)
    setOpenDay(null)
    setSaveError(null)
    setCalendarNote(null)
    try {
      await saveWeeklySchedule(next)
      void syncReminders().catch(() => undefined)
    } catch {
      setSchedule(previous)
      setSaveError("Couldn't save on this device. Try again.")
    }
  }

  async function addToCalendar() {
    if (!schedule) return
    setCalendarNote(null)
    const ics = buildScheduleIcs(schedule, new Map(templates.map((t) => [t.id, t.name])), reminderAt.time, new Date())
    if (!ics) {
      setCalendarNote('Plan a workout on at least one day first.')
      return
    }
    try {
      const done = await shareOrDownload(ics, 'workout-week.ics', 'text/calendar')
      if (done) setCalendarNote('Open the file to add your week to Calendar.')
    } catch {
      setCalendarNote("Couldn't make the calendar file. Try again.")
    }
  }

  function labelFor(plan: DayPlan | null): string {
    if (plan === null) return 'Not planned'
    if (plan === 'rest') return 'Rest'
    return templates.find((t) => t.id === plan)?.name ?? 'Not planned'
  }

  if (loadFailed) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <p className="font-bold">Couldn't load your week.</p>
        <button type="button" className="btn-primary w-full" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    )
  }
  if (!schedule) {
    return (
      <Skeleton className="p-4 space-y-3">
        <SkeletonBlock className="h-14 rounded-panel" />
        <SkeletonList rows={7} trailing />
      </Skeleton>
    )
  }

  const hasWorkoutDay = ROW_ORDER.some((d) => schedule[d] != null && schedule[d] !== 'rest')
  const workoutDays = ROW_ORDER.filter((d) => schedule[d] != null && schedule[d] !== 'rest').length
  const nextGoal = weeklyGoal(schedule)
  const goalChangesMonday = thisWeekGoal != null && nextGoal !== thisWeekGoal
  const todayKey = new Date().getDay() as keyof WeeklySchedule

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-lg font-bold">Your week</h1>
        <span className="w-12" />
      </div>

      {goalChangesMonday && (
        <p className="field-notice rounded-panel px-4 py-3 text-sm" role="status" data-testid="goal-starts-monday">
          This week's goal stays at {thisWeekGoal}. Your new goal of {nextGoal} starts Monday.
        </p>
      )}

      <RaeNote expression="focused">Pick a workout or a rest for each day. Today will follow your plan.</RaeNote>

      {saveError && (
        <p role="alert" className="text-sm font-semibold text-accent">
          {saveError}
        </p>
      )}

      {/* One button per day showing its pick; tapping opens that day's
          choices. (Seven rows of every routine as chips was 28+ buttons,
          with the last one cut off on every row.) */}
      <ul className="space-y-2">
        {ROW_ORDER.map((day) => {
          const current = schedule[day]
          const open = openDay === day
          const options: { plan: DayPlan | null; label: string }[] = [
            { plan: 'rest', label: 'Rest' },
            ...templates.map((t) => ({ plan: t.id as DayPlan, label: t.name })),
            { plan: null, label: 'Not planned' },
          ]
          return (
            <li key={day} className={open ? 'field-primary p-2 space-y-2' : ''}>
              <button
                type="button"
                aria-expanded={open}
                className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left ${open ? '' : 'card'} ${
                  day === todayKey && !open ? 'border-primary' : ''
                }`}
                onClick={() => setOpenDay(open ? null : day)}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="font-bold">{WEEKDAY_LABELS[day]}</span>
                  {/* Visual only: the row's accessible name stays "<day> <plan>". */}
                  {day === todayKey && (
                    <span aria-hidden="true" className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">
                      Today
                    </span>
                  )}
                </span>
                <PlanChip plan={current} label={labelFor(current)} />
                <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 flex-none text-ink-muted transition-transform ${open ? 'rotate-90' : ''}`}>
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open && (
                <div role="radiogroup" aria-label={`${WEEKDAY_LABELS[day]} plan`} className="grid grid-cols-2 gap-2">
                  {options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={current === option.plan}
                      className={`chip justify-center ${current === option.plan ? 'chip-active' : ''}`}
                      onClick={() => void set(day, option.plan)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {savingGoal && hasWorkoutDay && <GoalForecast title={savingGoal.title} remaining={savingGoal.remaining} days={workoutDays} />}

      {/* Reminders. The Android app schedules its own (ReminderCard); in a
          browser the phone's Calendar does the reminding (no push without a
          server). Shown once a day holds a workout; until then a hint says
          where reminders come from. */}
      {!hasWorkoutDay && (
        <p className="px-1 text-sm text-ink-muted">
          {remindersSupported()
            ? 'Plan a workout day and Rae can remind you.'
            : 'Plan a workout day and you can add reminders to your Calendar.'}
        </p>
      )}
      {hasWorkoutDay && remindersSupported() && <ReminderCard />}
      {isScheduleSet(schedule) && hasWorkoutDay && !remindersSupported() && (
        <section className="card p-4 space-y-3" aria-labelledby="reminders-heading">
          <h2 id="reminders-heading" className="font-bold">
            Reminders
          </h2>
          <div role="radiogroup" aria-label="Reminder time" className="flex flex-wrap gap-2">
            {REMINDER_TIMES.map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={reminderAt.label === option.label}
                className={`chip ${reminderAt.label === option.label ? 'chip-active' : ''}`}
                onClick={() => setReminderAt(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary w-full" onClick={() => void addToCalendar()}>
            Add to Calendar
          </button>
          {calendarNote && (
            <p role="status" className="text-sm text-ink-muted">
              {calendarNote}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

// A day's pick at a glance: a workout is a pink chip, rest a calm one, and
// an empty day a dashed "+ Plan" that invites the tap. The "Not planned"
// words stay in the text for screen readers and the row's name.
function PlanChip({ plan, label }: { plan: DayPlan | null; label: string }) {
  if (plan === null) {
    return (
      <span className="flex-none rounded-full border-2 border-dashed border-edge px-3 py-1 text-sm font-semibold text-ink-muted">
        <span aria-hidden="true">+ Plan</span>
        <span className="sr-only">{label}</span>
      </span>
    )
  }
  if (plan === 'rest') {
    return <span className="flex-none rounded-full bg-field-calm px-3 py-1 text-sm font-semibold">{label}</span>
  }
  return (
    <span className="min-w-0 max-w-[55%] truncate rounded-full bg-field-primary px-3 py-1 text-sm font-semibold text-primary-ink">
      {label}
    </span>
  )
}

// What the planned week is worth toward the reward she's saving for:
// "3 days a week ≈ +95 🥕 a week · Road trip in ~11 weeks".
function GoalForecast({ title, remaining, days }: { title: string; remaining: number; days: number }) {
  const f = weeklyForecast(days, remaining)
  return (
    <p className="hud-num px-1 text-sm font-semibold text-primary-ink" data-testid="goal-forecast">
      {f.ready
        ? `${title} is ready to redeem`
        : `${days} ${days === 1 ? 'day' : 'days'} a week ≈ +${f.perWeek} 🥕 a week · ${title} in ~${f.weeks} ${f.weeks === 1 ? 'week' : 'weeks'}`}
    </p>
  )
}
