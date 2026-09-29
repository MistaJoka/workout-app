import { useEffect, useState } from 'react'
import { listAllTemplates } from '../../domain/content/catalog'
import type { WorkoutTemplate } from '../../domain/content/types'
import { buildScheduleIcs, type TimeOfDay } from '../../domain/schedule/calendarExport'
import {
  EMPTY_SCHEDULE,
  WEEKDAY_LABELS,
  isScheduleSet,
  pruneSchedule,
  type DayPlan,
  type WeeklySchedule,
} from '../../domain/schedule/weeklySchedule'
import { getWeeklySchedule, saveWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import { shareOrDownload } from '../components/shareOrDownload'

// Monday-first rows; the schedule itself is keyed by JS weekday (0 = Sunday).
const ROW_ORDER: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0]

// Reminder times offered for the calendar export: a few fixed choices,
// one tap each, rather than a time picker.
const REMINDER_TIMES: { label: string; time: TimeOfDay }[] = [
  { label: '7 AM', time: { hour: 7, minute: 0 } },
  { label: 'Noon', time: { hour: 12, minute: 0 } },
  { label: '6 PM', time: { hour: 18, minute: 0 } },
  { label: '8 PM', time: { hour: 20, minute: 0 } },
]

export function ScheduleScreen() {
  const [openDay, setOpenDay] = useState<keyof WeeklySchedule | null>(null)
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState(REMINDER_TIMES[2])
  const [calendarNote, setCalendarNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)
    Promise.all([getWeeklySchedule(), listAllTemplates()])
      .then(async ([stored, { curated, custom }]) => {
        if (cancelled) return
        const all = [...curated, ...custom]
        const loaded = stored ?? { ...EMPTY_SCHEDULE }
        // A routine deleted elsewhere leaves its id behind; clear it so the
        // day reads "Not planned" and Today stops pointing at it.
        const pruned = pruneSchedule(loaded, new Set(all.map((t) => t.id)))
        if (pruned !== loaded) await saveWeeklySchedule(pruned).catch(() => undefined)
        setTemplates(all)
        setSchedule(pruned)
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
  if (!schedule) return <div className="p-4">Loading…</div>

  const hasWorkoutDay = ROW_ORDER.some((d) => schedule[d] != null && schedule[d] !== 'rest')

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-lg font-bold">Your week</h1>
        <span className="w-12" />
      </div>

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
                className={`flex w-full items-center justify-between px-4 py-3 text-left ${open ? '' : 'card'}`}
                onClick={() => setOpenDay(open ? null : day)}
              >
                <span className="font-bold">{WEEKDAY_LABELS[day]}</span>
                <span className={current === null ? 'text-ink-muted' : 'font-semibold text-primary-ink'}>
                  {labelFor(current)}
                </span>
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

      {/* Reminders: the phone's Calendar does the reminding (no push
          without a server). Shown once a day holds a workout. */}
      {isScheduleSet(schedule) && hasWorkoutDay && (
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
