import { useEffect, useState } from 'react'
import { listAllTemplates } from '../../domain/content/catalog'
import type { WorkoutTemplate } from '../../domain/content/types'
import { EMPTY_SCHEDULE, WEEKDAY_LABELS, type DayPlan, type WeeklySchedule } from '../../domain/schedule/weeklySchedule'
import { getWeeklySchedule, saveWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'

// Monday-first rows; the schedule itself is keyed by JS weekday (0 = Sunday).
const ROW_ORDER: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0]

export function ScheduleScreen() {
  const [openDay, setOpenDay] = useState<keyof WeeklySchedule | null>(null)
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])

  useEffect(() => {
    getWeeklySchedule().then((s) => setSchedule(s ?? { ...EMPTY_SCHEDULE }))
    listAllTemplates().then(({ curated, custom }) => setTemplates([...curated, ...custom]))
  }, [])

  function set(day: keyof WeeklySchedule, plan: DayPlan | null) {
    if (!schedule) return
    const next = { ...schedule, [day]: plan }
    setSchedule(next)
    setOpenDay(null)
    void saveWeeklySchedule(next)
  }

  function labelFor(plan: DayPlan | null): string {
    if (plan === null) return 'Not planned'
    if (plan === 'rest') return 'Rest'
    return templates.find((t) => t.id === plan)?.name ?? 'Not planned'
  }

  if (!schedule) return <div className="p-4">Loading…</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-lg font-bold">Your week</h1>
        <span className="w-12" />
      </div>

      <RaeNote expression="focused">Pick a workout or a rest for each day. Today will follow your plan.</RaeNote>

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
                <span className={current === null ? 'text-ink-muted' : 'font-semibold text-primary'}>
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
                      onClick={() => set(day, option.plan)}
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
    </div>
  )
}
