import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Where Tab lands next inside a dialog with `count` focusable elements:
// wraps at both ends so focus never leaves the sheet. -1 = nothing focused.
export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count === 0) return -1
  if (current < 0) return backwards ? count - 1 : 0
  return backwards ? (current - 1 + count) % count : (current + 1) % count
}

// Modal-sheet focus behavior: move focus into the sheet when it opens
// (`initialFocus`, else its first control), keep Tab inside it, close on
// Escape, and hand focus back to whatever opened it when it closes. Shared
// by ConfirmSheet and FilterSheet; any other bottom sheet can use it.
export function useSheetFocus(
  sheetRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  { enabled = true, initialFocus }: { enabled?: boolean; initialFocus?: RefObject<HTMLElement | null> } = {}
): void {
  // The latest onClose without re-running the effect (and re-stealing
  // focus) every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!enabled) return
    const sheet = sheetRef.current
    if (!sheet) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () => Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE))
    ;(initialFocus?.current ?? focusables()[0] ?? sheet).focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = nextFocusIndex(index, items.length, event.shiftKey)
      event.preventDefault()
      if (next >= 0) items[next].focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [enabled, sheetRef, initialFocus])
}
