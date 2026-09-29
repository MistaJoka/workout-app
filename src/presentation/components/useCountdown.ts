import { useEffect, useRef, useState } from 'react'
import { isRestComplete, remainingRestMs } from '../../domain/session/restTimer'
import { COUNTDOWN_TICKS, playCountdownTick } from '../../application/restFeedback'

function secondsUntil(endsAt: string): number {
  return Math.ceil(remainingRestMs(endsAt) / 1000)
}

// Whole seconds left until a persisted end time (a rest or a hold), derived
// from the timestamp alone so a refresh shows the same countdown. Ticks for
// the last three seconds when `tick` is on and calls onDone once at zero.
// State holds whole seconds: the 250ms poll keeps the display honest at
// second boundaries, but React bails out on an equal value, so the view
// re-renders once per second.
export function useCountdown(endsAt: string | null, onDone: () => void, tick: boolean): number {
  const [seconds, setSeconds] = useState(() => (endsAt ? secondsUntil(endsAt) : 0))
  // Latest callbacks/settings in refs so the interval never calls a stale
  // closure (e.g. feedback settings that arrived after the timer started).
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    if (!endsAt) return
    let last = secondsUntil(endsAt)
    setSeconds(last)
    const interval = setInterval(() => {
      const now = secondsUntil(endsAt)
      if (now !== last && now > 0 && COUNTDOWN_TICKS.includes(now) && tickRef.current) playCountdownTick()
      last = now
      setSeconds(now)
      if (isRestComplete(endsAt)) {
        clearInterval(interval)
        onDoneRef.current()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [endsAt])

  return seconds
}
