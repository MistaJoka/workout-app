import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { activeProfile, renameProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'

const KEY = 'welcomeDismissed'

// One-time first-run card on Today. Deliberately three lines, no tour:
// the flow itself is the tutorial (feedback_workout_app_ux_principles).
// It goes away on "Got it" or on its own once a workout has been finished
// (`finished`; null while Today is still loading, so it never flashes).
// While the profile still has the default name it also offers one optional
// field so Rae can greet this person by name (`onNamed` refreshes Today).
export function WelcomeCard({ finished, onNamed }: { finished: boolean | null; onNamed?: (name: string) => void }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const [named, setNamed] = useState(() => hasRealName(activeProfile().name))
  const [name, setName] = useState('')

  useEffect(() => {
    getSetting<boolean>(KEY)
      .then((value) => setDismissed(Boolean(value)))
      .catch(() => setDismissed(false))
  }, [])

  if (dismissed !== false || finished !== false) return null

  function saveName() {
    const trimmed = name.trim()
    if (!hasRealName(trimmed)) return
    renameProfile(activeProfile().id, trimmed)
    setNamed(true)
    onNamed?.(trimmed)
  }

  return (
    <div className="field-notice p-4 space-y-2">
      <p className="font-bold">Welcome</p>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li>Tap Start workout to begin. Up next keeps your workouts alternating.</li>
        <li>During a workout, every screen shows the movement and its steps.</li>
        <li>Every workout you finish grows a flower in your week.</li>
      </ul>
      {!named && (
        <form
          className="flex items-end gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            saveName()
          }}
        >
          <label className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-semibold">What should Rae call you?</span>
            <input
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={24}
              placeholder="Your first name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </label>
          <button type="submit" className="btn-secondary min-h-11" disabled={!hasRealName(name)}>
            Save
          </button>
        </form>
      )}
      <button
        className="btn-primary"
        onClick={() => {
          setDismissed(true)
          void setSetting(KEY, true)
        }}
      >
        Got it
      </button>
    </div>
  )
}
