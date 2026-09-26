import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

const KEY = 'welcomeDismissed'

// One-time first-run card on Today. Deliberately three lines, no tour:
// the flow itself is the tutorial (feedback_workout_app_ux_principles).
export function WelcomeCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    getSetting<boolean>(KEY).then((dismissed) => setVisible(!dismissed))
  }, [])

  if (!visible) return null

  return (
    <div className="field-notice p-4 space-y-2">
      <p className="font-bold">Welcome</p>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li>Tap a workout below to start. The one marked "up next" keeps you alternating.</li>
        <li>During a workout, every screen shows the movement and its steps.</li>
        <li>Build your own routines from the exercises in Library.</li>
      </ul>
      <button
        className="btn-primary"
        onClick={() => {
          setVisible(false)
          void setSetting(KEY, true)
        }}
      >
        Got it
      </button>
    </div>
  )
}
