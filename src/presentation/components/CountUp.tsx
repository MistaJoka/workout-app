import { useEffect, useState } from 'react'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'

// Counts a number up from 0 when it first appears (ease-out, ~600ms), so a
// finished workout's totals land with a little momentum. Under reduced/off
// motion the final value shows at once; the number is always the truth.
export function useCountUp(value: number, durationMs = 600): number {
  const { motion } = useTheme()
  const osReduced = usePrefersReducedMotion()
  const animate = effectiveMotion(motion, osReduced) === 'full'
  const [shown, setShown] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate || value <= 0) {
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setShown(Math.round(value * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, animate, durationMs])

  return shown
}
