import { useEffect, useState, type ReactNode } from 'react'

export const THUMB_BAR_ARM_MS = 700

// The fixed bottom action bar. Screens swap what's in it as the workout
// moves (Complete Set → Yes/No → Skip rest → next set → Back to Today),
// always under the same thumb, so a double tap would land the second tap
// on whatever replaced the first button: an unperformed set logged, a
// "Yes" nobody chose, the Complete screen skipped. Whenever `armKey`
// changes (and on mount) the bar ignores taps for a moment. It stops
// hit-testing rather than greying out, so nothing flickers on every set;
// keyboard and screen-reader activation are unaffected.
export function ThumbBar({ armKey, children, className = '' }: { armKey: string; children: ReactNode; className?: string }) {
  const [armedKey, setArmedKey] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setArmedKey(armKey), THUMB_BAR_ARM_MS)
    return () => clearTimeout(timer)
  }, [armKey])
  const armed = armedKey === armKey
  return (
    <div
      data-armed={armed}
      className={`fixed bottom-0 left-0 right-0 border-t-2 border-edge bg-surface p-4 ${className}`}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', pointerEvents: armed ? undefined : 'none' }}
    >
      {children}
    </div>
  )
}
