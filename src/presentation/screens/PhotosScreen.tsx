import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { PhotoAddButtons, usePhotoUrls } from '../components/progressPhotos'
import { useSheetFocus } from '../components/useSheetFocus'
import { deletePhoto, listLivePhotos } from '../../infrastructure/db/repositories/photosRepository'
import type { PhotoRecord } from '../../infrastructure/db/schema'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { shortDay } from '../activityDays'

// Progress photos (owner, 2026-10-29): the whole gallery, newest first.
// Tap a photo to see it full size (and delete it, after asking); in
// Compare, tap any two to see them side by side with their dates. Photos
// stay on this phone; only a backup she saves herself carries them.
export function PhotosScreen() {
  const [params, setParams] = useSearchParams()
  const [photos, setPhotos] = useState<PhotoRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [deleting, setDeleting] = useState<PhotoRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const urls = usePhotoUrls(photos ?? EMPTY)

  const comparing = params.get('compare') === '1'
  const viewing = photos?.find((p) => p.id === params.get('view')) ?? null
  const pair = picked.length === 2 ? picked.map((id) => photos?.find((p) => p.id === id)).filter((p): p is PhotoRecord => !!p) : []

  useEffect(() => {
    let cancelled = false
    listLivePhotos()
      .then((list) => {
        if (!cancelled) setPhotos(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setPhotos([])
          setError(storageErrorMessage(e, 'read'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  function setMode(next: { compare?: boolean; view?: string | null }) {
    const p = new URLSearchParams()
    if (next.compare) p.set('compare', '1')
    if (next.view) p.set('view', next.view)
    setParams(p, { replace: true })
  }

  function tap(photo: PhotoRecord) {
    if (!comparing) {
      setMode({ view: photo.id })
      return
    }
    setPicked((current) =>
      current.includes(photo.id) ? current.filter((id) => id !== photo.id) : [...current, photo.id].slice(-2)
    )
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await deletePhoto(deleting.id)
      setDeleting(null)
      setPicked([])
      setMode({ compare: comparing })
      setAttempt((n) => n + 1)
    } catch (e) {
      setError(storageErrorMessage(e, 'save'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <BackButton />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Photos</h1>
        {photos && photos.length > 1 && (
          <button
            type="button"
            className={`chip ${comparing ? 'chip-active' : ''}`}
            aria-pressed={comparing}
            aria-label="Compare two photos side by side"
            onClick={() => {
              setPicked([])
              setMode({ compare: !comparing })
            }}
          >
            Compare
          </button>
        )}
      </div>

      {comparing && (
        <p className="text-sm text-ink-muted" role="status">
          {picked.length === 0 ? 'Pick two' : picked.length === 1 ? 'Pick one more' : ''}
        </p>
      )}

      {!comparing && <PhotoAddButtons onAdded={() => setAttempt((n) => n + 1)} />}

      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      {photos && photos.length === 0 && <p className="text-ink-muted">No photos yet.</p>}

      {photos && photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Your photos" data-testid="photo-gallery">
          {photos.map((photo) => {
            const order = picked.indexOf(photo.id)
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  className={`relative block w-full overflow-hidden rounded-control border-2 ${
                    order >= 0 ? 'border-primary' : 'border-transparent'
                  }`}
                  aria-label={`Photo from ${shortDay(photo.day)}`}
                  {...(comparing ? { 'aria-pressed': order >= 0 } : {})}
                  onClick={() => tap(photo)}
                >
                  {urls.get(photo.id) && (
                    <img src={urls.get(photo.id)} alt="" className="aspect-[3/4] w-full object-cover" decoding="async" />
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 bg-surface text-center text-xs font-semibold">
                    {shortDay(photo.day)}
                  </span>
                  {order >= 0 && (
                    <span
                      aria-hidden
                      className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary"
                    >
                      {order + 1}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {viewing && !deleting && (
        <PhotoOverlay label={`Photo from ${shortDay(viewing.day)}`} onClose={() => setMode({})}>
          {urls.get(viewing.id) && (
            <img src={urls.get(viewing.id)} alt={`Progress photo, ${shortDay(viewing.day)}`} className="max-h-[70dvh] w-full object-contain" />
          )}
          <p className="text-center font-semibold">{shortDay(viewing.day)}</p>
          <button type="button" className="btn-ghost w-full" onClick={() => setDeleting(viewing)}>
            Delete
          </button>
        </PhotoOverlay>
      )}

      {pair.length === 2 && (
        <PhotoOverlay
          label={`Compare ${shortDay(pair[1].day)} and ${shortDay(pair[0].day)}`}
          onClose={() => setPicked([])}
          testId="photo-compare"
        >
          {/* Older on the left, newer on the right: before → after. */}
          <div className="grid grid-cols-2 gap-2">
            {[...pair]
              .sort((a, b) => a.day.localeCompare(b.day) || a.takenAt.localeCompare(b.takenAt))
              .map((photo) => (
                <figure key={photo.id} className="space-y-1">
                  {urls.get(photo.id) && (
                    <img
                      src={urls.get(photo.id)}
                      alt={`Progress photo, ${shortDay(photo.day)}`}
                      className="max-h-[60dvh] w-full rounded-control object-contain"
                    />
                  )}
                  <figcaption className="text-center text-sm font-semibold">{shortDay(photo.day)}</figcaption>
                </figure>
              ))}
          </div>
        </PhotoOverlay>
      )}

      {deleting && (
        <ConfirmSheet
          title="Delete this photo?"
          confirmLabel="Delete"
          cancelLabel="Keep it"
          busy={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        >
          {shortDay(deleting.day)}
        </ConfirmSheet>
      )}
    </div>
  )
}

const EMPTY: PhotoRecord[] = []

// A full-screen dialog for one photo or a pair: dark backdrop, the
// picture(s) and a big Close under the thumb.
function PhotoOverlay({
  label,
  onClose,
  children,
  testId,
}: {
  label: string
  onClose: () => void
  children: ReactNode
  testId?: string
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useSheetFocus(sheetRef, onClose, { initialFocus: closeRef })
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[100dvh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
      >
        {children}
        <button ref={closeRef} type="button" className="btn-primary btn-lg w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
