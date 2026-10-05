import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'

// A mega prize's progress as a little road trip: five flags at each 20%,
// filled once passed, and the van at her progress. The same numbers as the
// plain bar (and the same progressbar for screen readers); just a picture
// of how far along the months-long goal she is. The van glides only under
// full motion.
export function RoadProgress({ have, cost, label }: { have: number; cost: number; label: string }) {
  const { motion } = useTheme()
  const reduced = usePrefersReducedMotion()
  const animate = effectiveMotion(motion, reduced) === 'full'
  const pct = cost > 0 ? Math.max(0, Math.min(100, (have / cost) * 100)) : 100
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={cost}
      aria-valuenow={have}
      data-testid="road-progress"
      className="relative mt-1 block h-8 w-full"
    >
      <span aria-hidden className="absolute inset-x-1 top-[22px] block h-1.5 rounded-full bg-[var(--color-border)]" />
      <span
        aria-hidden
        className="absolute left-1 top-[22px] block h-1.5 rounded-full"
        style={{ width: `calc((100% - 0.5rem) * ${pct / 100})`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
      />
      {[20, 40, 60, 80, 100].map((stop) => (
        <span
          key={stop}
          aria-hidden
          className="absolute top-[12px] block text-[10px] leading-none"
          style={{ left: `calc(${stop}% - 6px)`, opacity: pct >= stop ? 1 : 0.35 }}
        >
          {stop === 100 ? '🏁' : '⚑'}
        </span>
      ))}
      <span
        aria-hidden
        className="absolute top-0 block text-lg leading-none"
        style={{ left: `calc(${pct}% - 12px)`, transition: animate ? 'left 0.8s ease-out' : 'none' }}
      >
        🚐
      </span>
    </span>
  )
}
