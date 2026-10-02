// Shares a plain link -- a gift link, never a file -- unlike
// shareOrDownload.ts (which always has a Blob to hand over), there is
// nothing to download here, so the Web Share API's {title, text, url} form
// is tried first and a clipboard copy is the fallback, never a download.
export type ShareLinkOutcome = 'shared' | 'copied' | 'failed'

export async function shareLink(input: { title: string; text: string; url: string }): Promise<ShareLinkOutcome> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(input)
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'failed'
      // Any other share failure falls through to a clipboard copy.
    }
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(input.url)
      return 'copied'
    }
  } catch {
    // Clipboard access blocked/unsupported: nothing left to try.
  }
  return 'failed'
}
