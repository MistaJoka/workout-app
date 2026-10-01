import { useEffect, useState, type ReactNode } from 'react'

// Shaped placeholders shown while a screen reads IndexedDB, in place of a
// bare "Loading…". Most reads land in a few milliseconds, so nothing is
// drawn until SKELETON_DELAY_MS has passed — a fast load never flickers.
// The wrapper is always a live status region with a visually hidden
// "Loading", so screen readers still hear it during the delay. Shimmer is
// full-motion only (index.css, "Skeleton loading" block).
export const SKELETON_DELAY_MS = 150

export function useDelayedFlag(ms: number = SKELETON_DELAY_MS): boolean {
  const [shown, setShown] = useState(ms <= 0)
  useEffect(() => {
    if (ms <= 0) return
    const id = window.setTimeout(() => setShown(true), ms)
    return () => window.clearTimeout(id)
  }, [ms])
  return shown
}

export function Skeleton({
  children,
  label = 'Loading',
  className = '',
  delayMs = SKELETON_DELAY_MS,
}: {
  children: ReactNode
  label?: string
  className?: string
  delayMs?: number
}) {
  const shown = useDelayedFlag(delayMs)
  return (
    <div role="status" aria-live="polite" data-skeleton={shown ? 'shown' : 'waiting'}>
      <span className="sr-only">{label}</span>
      {/* Layout classes go on the shapes' own container, so space-y-*
          spaces the shapes rather than the hidden label. */}
      {shown && (
        <div aria-hidden="true" className={className}>
          {children}
        </div>
      )}
    </div>
  )
}

// One grey shape. Size it with Tailwind (h-*, w-*, rounded-*).
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

// A card-styled row: optional square thumbnail, a title bar and a shorter
// detail bar, like the app's exercise/workout rows.
export function SkeletonRow({ thumb = false, trailing = false }: { thumb?: boolean; trailing?: boolean }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      {thumb && <SkeletonBlock className="h-12 w-12 flex-none rounded-control" />}
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        <SkeletonBlock className="h-3 w-1/3 rounded-full" />
      </div>
      {trailing && <SkeletonBlock className="h-4 w-12 flex-none rounded-full" />}
    </div>
  )
}

export function SkeletonList({ rows = 4, thumb = false, trailing = false }: { rows?: number; thumb?: boolean; trailing?: boolean }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} thumb={thumb} trailing={trailing} />
      ))}
    </div>
  )
}

// A row of stat tiles (Progress, Complete, exercise history).
export function SkeletonTiles({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="h-20 rounded-panel" />
      ))}
    </div>
  )
}

// A screen title with a smaller line under it.
export function SkeletonHeading() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-7 w-1/2 rounded-full" />
      <SkeletonBlock className="h-4 w-1/3 rounded-full" />
    </div>
  )
}
