import { useEffect, useState } from 'react'
import { useTheme } from '../theme/ThemeContext'
import type { MotionPreference } from '../theme/tokens'

type Props = {
  name: string
  start?: string
  finish?: string
}

// The app-level 'full' setting means "no explicit override", so the OS
// reduce-motion preference still applies (SOURCE_OF_TRUTH_V06.md §11).
// Resolving it here keeps the markup and the CSS in agreement: without
// this, the CSS strips the crossfade and the finish frame would sit on
// top of the start frame, hiding half the movement.
export function effectiveMotion(motion: MotionPreference, osPrefersReduced: boolean): MotionPreference {
  return motion === 'full' && osPrefersReduced ? 'reduced' : motion
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCE_QUERY).matches
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(REDUCE_QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefers(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return prefers
}

// Two-frame movement loop from the exercise's start/finish photos. With
// motion 'full' (and no OS reduce-motion) the frames alternate; otherwise
// both frames sit side by side so the movement is still fully visible
// without animation (§11: motion preference must not remove information).
export function MovementMedia({ name, start, finish }: Props) {
  const { motion } = useTheme()
  const osPrefersReduced = usePrefersReducedMotion()

  if (!start || !finish) return null

  if (effectiveMotion(motion, osPrefersReduced) !== 'full') {
    return (
      <div className="movement-media grid grid-cols-2 gap-2">
        <img src={start} alt={`${name} — start position`} className="w-full rounded-panel object-cover" />
        <img src={finish} alt={`${name} — end position`} className="w-full rounded-panel object-cover" />
      </div>
    )
  }

  return (
    <div className="movement-media">
      <div className="movement-loop relative w-full overflow-hidden rounded-panel" aria-label={`${name} movement`}>
        <img src={start} alt={`${name} — start position`} className="max-h-[34vh] w-full object-cover" />
        <img
          src={finish}
          alt=""
          aria-hidden="true"
          className="movement-loop__finish absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}
