import { useEffect, useState } from 'react'
import type { TimeOfDay } from '../../domain/schedule/calendarExport'
import { DEFAULT_REMINDER_SETTINGS, type ReminderSettings } from '../../domain/schedule/reminderPlan'
import {
  getReminderSettings,
  reminderPermission,
  requestReminderPermission,
  saveReminderSettings,
  syncReminders,
} from '../../infrastructure/reminders'

// Reminder times: a few fixed choices, one tap each, rather than a time
// picker. Shared with the browser's calendar export on Schedule.
export const REMINDER_TIMES: { label: string; time: TimeOfDay }[] = [
  { label: '7 AM', time: { hour: 7, minute: 0 } },
  { label: 'Noon', time: { hour: 12, minute: 0 } },
  { label: '6 PM', time: { hour: 18, minute: 0 } },
  { label: '8 PM', time: { hour: 20, minute: 0 } },
]

const sameTime = (a: TimeOfDay, b: TimeOfDay) => a.hour === b.hour && a.minute === b.minute
const labelFor = (time: TimeOfDay) => REMINDER_TIMES.find((o) => sameTime(o.time, time))?.label ?? ''

const BLOCKED =
  'Notifications are off for this app. Turn them on in Android Settings, Apps, Foundation Strength, Notifications.'

// Android app only (Schedule shows "Add to Calendar" in a browser): a nudge
// from Rae on planned workout days (infrastructure/reminders.ts).
export function ReminderCard() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getReminderSettings(), reminderPermission().catch(() => 'prompt' as const)])
      .then(([stored, permission]) => {
        if (cancelled) return
        setSettings(stored)
        if (stored.enabled && permission === 'denied') setNote(BLOCKED)
      })
      .catch(() => {
        if (!cancelled) setSettings(DEFAULT_REMINDER_SETTINGS)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function apply(next: ReminderSettings, saidOn: boolean) {
    const previous = settings
    setSettings(next)
    setNote(null)
    try {
      await saveReminderSettings(next)
      await syncReminders()
      if (next.enabled && saidOn) setNote(`Rae will check in at ${labelFor(next.time)} on your workout days.`)
    } catch {
      setSettings(previous)
      setNote("Couldn't set reminders. Try again.")
    }
  }

  async function toggle() {
    if (!settings) return
    if (settings.enabled) return apply({ ...settings, enabled: false }, false)
    const permission = await requestReminderPermission().catch(() => 'denied' as const)
    if (permission !== 'granted') {
      setNote(BLOCKED)
      return
    }
    return apply({ ...settings, enabled: true }, true)
  }

  if (!settings) return null
  return (
    <section className="card p-4 space-y-3" aria-labelledby="reminders-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="reminders-heading" className="font-bold">
          Reminders
        </h2>
        <button
          type="button"
          className={`chip ${settings.enabled ? 'chip-active' : ''}`}
          aria-pressed={settings.enabled}
          onClick={() => void toggle()}
        >
          {settings.enabled ? 'On' : 'Off'}
        </button>
      </div>
      {settings.enabled && (
        <div role="radiogroup" aria-label="Reminder time" className="flex flex-wrap gap-2">
          {REMINDER_TIMES.map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={sameTime(settings.time, option.time)}
              className={`chip ${sameTime(settings.time, option.time) ? 'chip-active' : ''}`}
              onClick={() => void apply({ ...settings, time: option.time }, true)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {note && (
        <p role="status" className="text-sm text-ink-muted">
          {note}
        </p>
      )}
    </section>
  )
}
