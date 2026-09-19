import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllTemplates } from '../../domain/content/catalog'
import type { WorkoutTemplate } from '../../domain/content/types'
import { EMPTY_SCHEDULE, WEEKDAY_LABELS, type DayPlan, type WeeklySchedule } from '../../domain/schedule/weeklySchedule'
import { getWeeklySchedule, saveWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { Chip } from './LibraryScreen'

// Monday-first rows; the schedule itself is keyed by JS weekday (0 = Sunday).
const ROW_ORDER: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0]

export function ScheduleScreen() {
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])

  useEffect(() => {
    getWeeklySchedule().then((s) => setSchedule(s ?? { ...EMPTY_SCHEDULE }))
    listAllTemplates().then(({ curated, custom }) => setTemplates([...curated, ...custom]))
  }, [])

  function set(day: keyof WeeklySchedule, plan: DayPlan) {
    if (!schedule) return
    // Tapping the active chip clears the day.
    const next = { ...schedule, [day]: schedule[day] === plan ? null : plan }
    setSchedule(next)
    void saveWeeklySchedule(next)
  }

  if (!schedule) return <div className="p-4">Loading…</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost -ml-3" onClick={() => navigate(-1)}>
          ‹ Back
        </button>
        <h1 className="text-lg font-bold">Your week</h1>
        <span className="w-12" />
      </div>
      <p className="text-sm text-ink-muted">Tap a routine for each day. Today picks it up automatically.</p>

      <ul className="space-y-3">
        {ROW_ORDER.map((day) => (
          <li key={day} className="card p-3 space-y-2">
            <p className="font-bold">{WEEKDAY_LABELS[day]}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip active={schedule[day] === 'rest'} onClick={() => set(day, 'rest')}>
                Rest
              </Chip>
              {templates.map((t) => (
                <Chip key={t.id} active={schedule[day] === t.id} onClick={() => set(day, t.id)}>
                  {t.name}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
