// Hands a generated file to the user. In an iPhone home-screen app a plain
// download link is clumsy, so the share sheet (Save to Files, Calendar,
// AirDrop) is tried first; elsewhere it falls back to a download. Returns
// false only if the user dismissed the share sheet.
export async function shareOrDownload(content: string | Blob, filename: string, type: string): Promise<boolean> {
  const file = new File([content], filename, { type })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false
      // Any other share failure falls through to a download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking right away can cancel the download in WebKit.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
