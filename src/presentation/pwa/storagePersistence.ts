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

export type StorageEstimate = { usage?: number; quota?: number }

// How much of the browser's allowance the app uses (docs/IOS_PWA_RUNTIME.md
// asks for it). Undefined where the API is missing or fails.
export async function getStorageEstimate(): Promise<StorageEstimate | undefined> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return undefined
    return await navigator.storage.estimate()
  } catch {
    return undefined
  }
}

function megabytes(bytes: number): string {
  const mb = bytes / 1_000_000
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`
}

export function storageUsageLabel(estimate: StorageEstimate | undefined): string | null {
  if (!estimate || estimate.usage === undefined) return null
  if (!estimate.quota) return `Using ${megabytes(estimate.usage)}`
  const percent = Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
  return `Using ${megabytes(estimate.usage)} of ${megabytes(estimate.quota)} (${percent}%)`
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
