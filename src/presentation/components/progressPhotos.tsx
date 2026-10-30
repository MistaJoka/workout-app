import { useEffect, useRef, useState } from 'react'
import { photoDay } from '../../domain/progress/photos'
import { savePhoto } from '../../infrastructure/db/repositories/photosRepository'
import type { PhotoRecord } from '../../infrastructure/db/schema'
import { PhotoDecodeError, encodeProgressPhoto } from '../../infrastructure/photoEncoding'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { ensurePersistentStorage } from '../pwa/storagePersistence'

// Adds one picked/taken picture: asks again for persistent storage (photos
// are the biggest thing the app keeps), re-encodes it on the device, then
// stores it. Every failure is local: an unreadable picture, or storage
// (quota included), never the network.
export async function addProgressPhoto(file: File): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    void ensurePersistentStorage()
    const encoded = await encodeProgressPhoto(file)
    await savePhoto({ ...encoded, day: photoDay(file.lastModified, new Date()) })
    return { ok: true }
  } catch (error) {
    if (error instanceof PhotoDecodeError) return { ok: false, message: "Couldn't read that picture. Try another." }
    return { ok: false, message: storageErrorMessage(error, 'save') }
  }
}

// Object URLs for stored photo Blobs, revoked when the list changes or the
// screen goes away (each one pins its Blob in memory until revoked).
export function usePhotoUrls(photos: readonly PhotoRecord[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const next = new Map<string, string>()
    for (const photo of photos) if (photo.blob) next.set(photo.id, URL.createObjectURL(photo.blob))
    setUrls(next)
    return () => {
      for (const url of next.values()) URL.revokeObjectURL(url)
    }
  }, [photos])
  return urls
}

// Two ways in: the camera (front, for a mirror-free selfie) or the gallery.
// Both are plain file inputs: the phone's own camera/picker, no camera API.
export function PhotoAddButtons({ onAdded }: { onAdded: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    const outcome = await addProgressPhoto(file)
    setBusy(false)
    if (outcome.ok) onAdded()
    else setError(outcome.message)
  }

  const input = (ref: typeof cameraRef, capture: boolean, testId: string) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      {...(capture ? { capture: 'user' as const } : {})}
      className="hidden"
      data-testid={testId}
      onChange={(event) => {
        const file = event.target.files?.[0]
        // Cleared so picking the same file again still fires onChange.
        event.target.value = ''
        void handle(file)
      }}
    />
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={busy}
          aria-label="Take a progress photo"
          onClick={() => cameraRef.current?.click()}
        >
          <span aria-hidden>📷</span> Camera
        </button>
        <button
          type="button"
          className="btn-secondary flex-1"
          disabled={busy}
          aria-label="Add a progress photo from your gallery"
          onClick={() => galleryRef.current?.click()}
        >
          <span aria-hidden>🖼️</span> Gallery
        </button>
      </div>
      {input(cameraRef, true, 'photo-camera-input')}
      {input(galleryRef, false, 'photo-gallery-input')}
      {busy && (
        <p className="text-sm text-ink-muted" role="status">
          Saving…
        </p>
      )}
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
