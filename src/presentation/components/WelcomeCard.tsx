import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

const KEY = 'welcomeDismissed'

// One-time first-run card on Today. Deliberately three lines, no tour:
// the flow itself is the tutorial (feedback_workout_app_ux_principles).
// It goes away on "Got it" or on its own once a workout has been finished
// (`finished`; null while Today is still loading, so it never flashes).
export function WelcomeCard({ finished }: { finished: boolean | null }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    getSetting<boolean>(KEY)
      .then((value) => setDismissed(Boolean(value)))
      .catch(() => setDismissed(false))
  }, [])

  if (dismissed !== false || finished !== false) return null

  return (
    <div className="field-notice p-4 space-y-2">
      <p className="font-bold">Welcome</p>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li>Tap Start workout to begin. Up next keeps your workouts alternating.</li>
        <li>During a workout, every screen shows the movement and its steps.</li>
        <li>Every workout you finish grows a flower in your week.</li>
      </ul>
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
