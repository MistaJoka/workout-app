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
