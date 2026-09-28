import type { ExportBundle } from './exportImport'

// Triggers a browser download of a backup bundle. Shared by Settings and
// the error boundary so both name and shape the file identically. The file
// name carries the profile, so two people's backups can't be mixed up.
export function downloadBackup(bundle: ExportBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName(bundle)
  link.click()
  // Revoking synchronously can cancel the download in WebKit/standalone
  // PWAs before it has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function backupFileName(bundle: Pick<ExportBundle, 'exportedAt' | 'profile'>): string {
  const who = (bundle.profile?.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `workout-app-backup-${who ? `${who}-` : ''}${bundle.exportedAt.slice(0, 10)}.json`
}
