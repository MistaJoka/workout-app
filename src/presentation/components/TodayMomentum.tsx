import { useEffect, useState, type CSSProperties } from 'react'

const SHOWN_KEY = 'workout-app:momentum-shown'

// The momentum pieces (goal line, milestone bar, bloom chip) rise in once a
// day, the first time Today opens; after that they just sit there.
export function useMomentumEntrance(today: string): boolean {
  const [animate] = useState(() => {
    try {
      return localStorage.getItem(SHOWN_KEY) !== today
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(SHOWN_KEY, today)
    } catch {
      // Storage blocked: it just animates again next time.
    }
  }, [today])
  return animate
}

// Full motion only: a short rise, staggered by --momentum-i. Delays are
// zeroed under reduced/off motion so nothing waits unseen.
export const MOMENTUM_STYLE = `
@keyframes momentum-rise { from { opacity: 0; margin-top: 6px; } to { opacity: 1; margin-top: 0; } }
[data-motion='full'] .momentum-in { animation: momentum-rise 0.32s ease-out both; animation-delay: calc(var(--momentum-i, 0) * 110ms + 150ms); }
[data-motion='reduced'] .momentum-in, [data-motion='off'] .momentum-in { animation: none; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .momentum-in { animation: none; } }
`

export function momentumProps(animate: boolean, index: number): { className: string; style?: CSSProperties } {
  if (!animate) return { className: '' }
  return { className: 'momentum-in', style: { '--momentum-i': index } as CSSProperties }
}

// Milestone bar ("7 of 10 to your 10th workout") and, when there is one, the
// bloom streak chip. Sits inside the week card, under the pots.
export function MomentumStrip({
  milestone,
  streak,
  animate,
}: {
  milestone: { done: number; target: number; label: string } | null
  streak: string | null
  animate: boolean
}) {
  if (!milestone && !streak) return null
  const bar = momentumProps(animate, 1)
  const chip = momentumProps(animate, 2)
  return (
    <div className="flex items-center gap-3 border-t-2 border-[var(--color-border)] px-1 pb-1 pt-2">
      {milestone && (
        <div className={`min-w-0 flex-1 ${bar.className}`} style={bar.style}>
          <p className="truncate text-xs font-semibold text-ink-muted">{milestone.label}</p>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
            role="progressbar"
            aria-label={milestone.label}
            aria-valuemin={0}
            aria-valuemax={milestone.target}
            aria-valuenow={milestone.done}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${(milestone.done / milestone.target) * 100}%` }} />
          </div>
        </div>
      )}
      {streak && (
        <span
          className={`flex flex-none items-center gap-1.5 rounded-full bg-field-success py-1 pl-1.5 pr-3 text-xs font-bold ${chip.className}`}
          style={chip.style}
        >
          <SproutIcon />
          {streak}
        </span>
      )}
    </div>
  )
}

// A tiny pixel sprout for the bloom chip, same 16px grid as the pots.
function SproutIcon() {
  return (
    <svg viewBox="0 0 8 8" width="16" height="16" shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="3" width="1" height="5" fill="#3f9d5b" />
      <rect x="1" y="2" width="2" height="2" fill="#5cc27a" />
      <rect x="4" y="1" width="2" height="2" fill="#5cc27a" />
      <rect x="3" y="0" width="1" height="1" fill="#f472b6" />
    </svg>
  )
}
