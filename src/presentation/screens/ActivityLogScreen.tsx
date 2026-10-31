import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, goBackOrToday } from '../components/BackButton'
import { ThumbBar } from '../components/ThumbBar'
import {
  ACTIVITY_KINDS,
  ACTIVITY_MINUTE_CHOICES,
  DEFAULT_ACTIVITY_MINUTES,
  activityDayChoices,
  activityKind,
  adjustMinutes,
  type ActivityKind,
} from '../../domain/progress/activities'
import { logActivity } from '../../infrastructure/db/repositories/activitiesRepository'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { activityDayLabel } from '../activityDays'

// Log other activity (owner, 2026-10-29): a workout done outside the app.
// Three picks, all one-finger: what (kind chips), how long (quick minutes
// plus a stepper), when (today or up to 7 days back). It counts toward
// the week's goal and streak only (domain/progress/activities.ts). Reached
// from Today's workout row and Progress; Save goes back to where she was.
export function ActivityLogScreen() {
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const days = useMemo(() => activityDayChoices(now), [now])
  const [kind, setKind] = useState<ActivityKind | null>(null)
  const [minutes, setMinutes] = useState<number>(DEFAULT_ACTIVITY_MINUTES)
  const [day, setDay] = useState(days[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function leave() {
    goBackOrToday(navigate, '/progress')
  }

  async function save() {
    if (!kind || saving) return
    setSaving(true)
    setError(null)
    try {
      await logActivity({ kind, minutes, day }, new Date())
      leave()
    } catch (e) {
      setError(storageErrorMessage(e, 'save'))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-32">
      <BackButton />
      <h1 className="text-xl font-bold">Other activity</h1>

      <fieldset className="min-w-0">
        <legend className="sr-only">What did you do?</legend>
        <div className="grid grid-cols-4 gap-2" data-testid="activity-kinds">
          {ACTIVITY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              aria-label={k.name}
              onClick={() => setKind(k.id)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-control border-2 px-1 py-1 ${
                kind === k.id ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
              }`}
            >
              <span aria-hidden className="text-2xl leading-none">
                {k.emoji}
              </span>
              <span aria-hidden className="mt-0.5 text-xs font-bold">
                {k.name}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-2">
        <legend className="sr-only">How long?</legend>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="stepper-btn"
            aria-label="5 minutes less"
            onClick={() => setMinutes((m) => adjustMinutes(m, -1))}
          >
            −
          </button>
          <p className="hud-num text-2xl font-bold" aria-live="polite" data-testid="activity-minutes">
            {minutes} min
          </p>
          <button
            type="button"
            className="stepper-btn"
            aria-label="5 minutes more"
            onClick={() => setMinutes((m) => adjustMinutes(m, 1))}
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          {ACTIVITY_MINUTE_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              aria-label={`${m} minutes`}
              className={`chip flex-1 justify-center ${minutes === m ? 'chip-active' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">When?</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {days.map((d) => {
            const label = activityDayLabel(d, now)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={day === d}
                aria-label={label.long}
                className={`chip ${day === d ? 'chip-active' : ''}`}
                onClick={() => setDay(d)}
              >
                {label.short}
              </button>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <ThumbBar armKey="activity">
        <button
          type="button"
          className="btn-primary btn-lg w-full"
          disabled={!kind || saving}
          aria-label={kind ? `Save ${activityKind(kind).name}, ${minutes} minutes, ${activityDayLabel(day, now).long}` : 'Save'}
          onClick={() => void save()}
        >
          Save
        </button>
      </ThumbBar>
    </div>
  )
}
