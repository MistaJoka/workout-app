import { isNativeApp } from '../appContext'
import { shareFileNative } from '../../infrastructure/nativeShare'

// Hands a generated file to the user. In an iPhone home-screen app a plain
// download link is clumsy, so the share sheet (Save to Files, Calendar,
// AirDrop) is tried first; elsewhere it falls back to a download. Returns
// false only if the user dismissed the share sheet.
//
// `message` adds a title/text alongside the file in the share sheet itself
// (the redeemed-coupon share includes a short code this way, giftLink.ts's
// couponShareMessage) -- it's ignored by the download fallback, which has
// no caption of its own to carry it.
//
// The Android app's WebView has neither file sharing nor downloads, so
// there it goes to Android's own share sheet (infrastructure/nativeShare.ts).
export async function shareOrDownload(
  content: string | Blob,
  filename: string,
  type: string,
  message?: { title?: string; text?: string }
): Promise<boolean> {
  if (isNativeApp()) return (await shareFileNative(content, filename, message)) === 'shared'
  const file = new File([content], filename, { type })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], ...(message?.title ? { title: message.title } : {}), ...(message?.text ? { text: message.text } : {}) })
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
