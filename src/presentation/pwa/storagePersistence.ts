export type StorageStatus = 'protected' | 'best-effort' | 'unknown'

let requested: Promise<StorageStatus> | null = null

// Asks the browser not to evict this origin's IndexedDB under storage
// pressure. Called once at startup; the answer is cached for About.
export function requestPersistentStorage(): Promise<StorageStatus> {
  if (!requested) {
    requested = (async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unknown'
        const already = (await navigator.storage.persisted?.()) ?? false
        const granted = already || (await navigator.storage.persist())
        return granted ? 'protected' : 'best-effort'
      } catch {
        return 'unknown'
      }
    })()
  }
  return requested
}

export function storageStatusLabel(status: StorageStatus): string {
  switch (status) {
    case 'protected':
      return 'Storage: protected from automatic cleanup'
    case 'best-effort':
      return 'Storage: best effort (the browser may reclaim it if space runs low — keep a backup)'
    default:
      return 'Storage: unknown'
  }
}
