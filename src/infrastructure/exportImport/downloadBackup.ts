import type { ExportBundle } from './exportImport'

// Triggers a browser download of a backup bundle. Shared by Settings and
// the error boundary so both name and shape the file identically.
export function downloadBackup(bundle: ExportBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `workout-app-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}
