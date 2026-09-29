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

type ShareCapable = {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[]; title?: string }) => Promise<void>
}

// In an iPhone home-screen app a download link is clumsy; the share sheet
// lets the file go to Files, AirDrop or Messages. Falls back to a download
// wherever sharing files isn't supported. A dismissed share sheet is
// 'cancelled', so the caller doesn't record a backup that never happened.
export async function saveBackup(
  bundle: ExportBundle,
  nav: ShareCapable = typeof navigator !== 'undefined' ? (navigator as ShareCapable) : {},
  download: (bundle: ExportBundle) => void = downloadBackup
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([JSON.stringify(bundle, null, 2)], backupFileName(bundle), { type: 'application/json' })
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Workout backup' })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    }
  }
  download(bundle)
  return 'downloaded'
}

export function backupFileName(bundle: Pick<ExportBundle, 'exportedAt' | 'profile'>): string {
  const who = (bundle.profile?.name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `workout-app-backup-${who ? `${who}-` : ''}${bundle.exportedAt.slice(0, 10)}.json`
}
