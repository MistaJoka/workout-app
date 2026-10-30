import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBackOrToday } from './BackButton'
import { backSentinels } from './historySentinel'

// One screen at a time may hold unsaved edits (the routine builder). The
// app uses HashRouter, which has no route blocking, so leaving through the
// tab bar asks this guard instead: with a guard set, the tab bar hands the
// navigation to it (which shows "Leave without saving?") rather than going.
type Guard = (proceed: () => void) => void

let current: Guard | null = null

// Returns a clear function that only clears this guard, so a screen that
// unmounts after another one registered can't wipe the newer guard.
export function setUnsavedGuard(guard: Guard | null): () => void {
  current = guard
  return () => {
    if (current === guard) current = null
  }
}

export function guardNavigation(go: () => void): void {
  if (current) current(go)
  else go()
}

// The Android back gesture is a history traversal the tab-bar guard never
// sees. While `dirty`, one sentinel history entry sits on top of this page
// (historySentinel.ts): Back pops it, the page stays, and `ask` gets the
// same `proceed` the BackButton would use (back one entry, or Today). The
// sentinel is put back while still dirty and removed once clean, saving or
// gone, so history never collects junk entries.
export function useBackGuard(dirty: boolean, ask: (proceed: () => void) => void): void {
  const navigate = useNavigate()
  const askRef = useRef(ask)
  askRef.current = ask
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    const sentinels = backSentinels()
    if (!dirty || !sentinels) return
    return sentinels.hold(() => askRef.current(() => goBackOrToday(navigateRef.current)))
  }, [dirty])
}
