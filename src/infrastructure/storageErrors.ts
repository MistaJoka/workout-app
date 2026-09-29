// Local storage failures are real and are never network failures
// (CLAUDE.md, platform quality rules). One place to tell "the phone is out
// of space" apart from any other write failure, for every screen that saves.

// Dexie wraps the browser's error (e.g. an AbortError whose `inner` is the
// QuotaExceededError), so look one level in.
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'QuotaExceededError') return true
  const inner = (error as Error & { inner?: unknown }).inner
  return inner instanceof Error && inner.name === 'QuotaExceededError'
}

export function storageErrorMessage(error: unknown, action: 'save' | 'read'): string {
  if (isQuotaError(error)) {
    return 'This phone is out of space for the app. Export a backup, then free up some space.'
  }
  return action === 'save' ? "Couldn't save on this device. Try again." : "Couldn't read this device's data. Try again."
}
