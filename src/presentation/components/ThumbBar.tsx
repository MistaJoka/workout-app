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
// `aboveTabBar` lifts it over the 64px tab bar on screens inside the shell
// (and drops the safe-area padding, which the tab bar already takes).
// True once `armKey` has held still for THUMB_BAR_ARM_MS (and after mount).
// Anything else that stands in for a bar button (the player's tap-anywhere
// stage) arms on the same key, so a double tap can't land there either.
export function useArmed(armKey: string): boolean {
  const [armedKey, setArmedKey] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setArmedKey(armKey), THUMB_BAR_ARM_MS)
    return () => clearTimeout(timer)
  }, [armKey])
  return armedKey === armKey
}

export function ThumbBar({
  armKey,
  children,
  className = '',
  aboveTabBar = false,
}: {
  armKey: string
  children: ReactNode
  className?: string
  aboveTabBar?: boolean
}) {
  const armed = useArmed(armKey)
  return (
    <div
      data-armed={armed}
      // `app-column-fixed` (index.css) clamps this fixed bar to the same
      // centered column as the tab bar/screens on wide viewports.
      className={`app-column-fixed fixed ${aboveTabBar ? 'bottom-16' : 'bottom-0'} border-t-2 border-edge bg-surface p-4 ${className}`}
      style={{
        paddingBottom: aboveTabBar ? undefined : 'max(1rem, env(safe-area-inset-bottom))',
        pointerEvents: armed ? undefined : 'none',
      }}
    >
      {children}
    </div>
  )
}
