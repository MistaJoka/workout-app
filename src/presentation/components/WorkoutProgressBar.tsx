import { useEffect, useState } from 'react'

// The share last drawn, so a bar that remounts (the player coming back from
// a rest) can grow from where it was instead of jumping. Module-level: one
// player at a time.
let lastShare = 0

// Sets done across the whole workout, as one bar in the player header.
// With `animate`, it fills smoothly from the previous share and a glint
// runs along it when it grows.
export function WorkoutProgressBar({
  done,
  total,
  label,
  animate = false,
}: {
  done: number
  total: number
  label: string
  animate?: boolean
}) {
  const share = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0
  const [grows] = useState(() => animate && lastShare < share)
  const [shown, setShown] = useState(grows ? lastShare : share)

  useEffect(() => {
    lastShare = share
    if (shown === share) return
    const raf = requestAnimationFrame(() => setShown(share))
    return () => cancelAnimationFrame(raf)
  }, [share, shown])

  return (
    <div
      className="workout-progress relative"
      role="progressbar"
      aria-label="Workout progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${label}, ${done} of ${total} sets done`}
    >
      {grows && <style>{GLINT_CSS}</style>}
      <div className="workout-progress__fill relative overflow-hidden" style={{ width: `${shown * 100}%` }}>
        {grows && <span className="workout-progress__glint" aria-hidden="true" />}
      </div>
    </div>
  )
}

const GLINT_CSS = `
.workout-progress__fill { transition: width 600ms cubic-bezier(0.25, 1, 0.5, 1); }
.workout-progress__glint {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.85) 50%, transparent 80%);
  animation: workout-progress-glint 900ms ease-out 250ms both;
}
@keyframes workout-progress-glint {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
`
