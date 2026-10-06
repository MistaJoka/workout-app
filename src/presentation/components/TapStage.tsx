import { useState, type MouseEvent, type ReactNode } from 'react'
import { useArmed } from './ThumbBar'
import { hasLearnedStageTap, markStageTapLearned, stageTapAction, type StageTap } from '../stageTap'

type Ripple = { id: number; x: number; y: number }

// The player's stage as one big button: tapping Rae or the target does what
// the bar's first button does (stageTap.ts decides when that's safe). A
// ripple marks where the thumb landed. Until this profile has used it once,
// a soft ring around the stage hints that it's tappable. Screen readers and
// keyboards keep the real Complete Set button in the bar, so the stage adds
// no role of its own; a scroll never fires a click, so swiping past Rae is
// safe.
export function TapStage({
  armKey,
  awaitingRepCheck,
  askingReps,
  timed,
  holding,
  busy,
  onTap,
  children,
}: {
  armKey: string
  awaitingRepCheck: boolean
  askingReps: boolean
  timed: boolean
  holding: boolean
  busy: boolean
  onTap: (action: Exclude<StageTap, null>) => void
  children: ReactNode
}) {
  const armed = useArmed(armKey)
  const [learned, setLearned] = useState(hasLearnedStageTap)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const action = stageTapAction({ awaitingRepCheck, askingReps, timed, holding, busy, armed })

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!action) return
    const box = event.currentTarget.getBoundingClientRect()
    const ripple = { id: Date.now(), x: event.clientX - box.left, y: event.clientY - box.top }
    setRipples((all) => [...all, ripple])
    setTimeout(() => setRipples((all) => all.filter((r) => r.id !== ripple.id)), 600)
    if (!learned) {
      markStageTapLearned()
      setLearned(true)
    }
    onTap(action)
  }

  return (
    <div className="tap-stage relative" data-tappable={action !== null} onClick={handleClick}>
      {children}
      <span aria-hidden="true" className="tap-stage-layer">
        {!learned && action && <span className="tap-stage-hint" />}
        {ripples.map((r) => (
          <span key={r.id} className="tap-stage-ripple" style={{ left: r.x, top: r.y }} />
        ))}
      </span>
    </div>
  )
}
