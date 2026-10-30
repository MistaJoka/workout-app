import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { BodyWeightCard } from './BodyWeightCard'
import { MeasurementsCard } from './MeasurementsCard'
import { PhotoAddButtons, usePhotoUrls } from './progressPhotos'
import { listLivePhotos } from '../../infrastructure/db/repositories/photosRepository'
import type { PhotoRecord } from '../../infrastructure/db/schema'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { shortDay } from '../activityDays'

// Body, in Progress > More: weight, measurements and photos as three tabs
// of one panel, so adding measurements and photos (owner, 2026-10-29) never
// turns Progress into a longer page. Only the open tab renders.
type Tab = 'weight' | 'size' | 'photos'

const TABS: { id: Tab; label: string; name: string }[] = [
  { id: 'weight', label: 'Weight', name: 'Body weight' },
  { id: 'size', label: 'Size', name: 'Body measurements' },
  { id: 'photos', label: 'Photos', name: 'Progress photos' },
]

export function BodyPanel() {
  const [tab, setTab] = useState<Tab>('weight')
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ weight: null, size: null, photos: null })

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="card space-y-3 p-3" aria-label="Body" data-testid="body-panel">
      <div role="tablist" aria-label="Body" className="flex gap-2" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el
            }}
            type="button"
            role="tab"
            id={`body-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`body-panel-${t.id}`}
            aria-label={t.name}
            tabIndex={tab === t.id ? 0 : -1}
            className={`chip flex-1 justify-center ${tab === t.id ? 'chip-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`body-panel-${tab}`} aria-labelledby={`body-tab-${tab}`}>
        {tab === 'weight' && <BodyWeightCard bare />}
        {tab === 'size' && <MeasurementsCard />}
        {tab === 'photos' && <PhotosTab />}
      </div>
    </section>
  )
}

// The newest few photos and the two ways to add one; the whole gallery,
// the viewer and compare live on /photos.
const PREVIEW = 6

function PhotosTab() {
  const [photos, setPhotos] = useState<PhotoRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Memoized: usePhotoUrls re-makes its URLs whenever the list identity changes.
  const shown = useMemo(() => photos?.slice(0, PREVIEW) ?? [], [photos])
  const urls = usePhotoUrls(shown)

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

  return (
    <div className="space-y-2">
      {photos && photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Newest photos" data-testid="photo-preview">
          {shown.map((photo) => (
            <li key={photo.id}>
              <Link
                to={`/photos?view=${encodeURIComponent(photo.id)}`}
                className="block overflow-hidden rounded-control bg-bg"
                aria-label={`Photo from ${shortDay(photo.day)}`}
              >
                {urls.get(photo.id) && (
                  <img src={urls.get(photo.id)} alt="" className="aspect-[3/4] w-full object-cover" decoding="async" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {photos && photos.length === 0 && <p className="text-sm text-ink-muted">No photos yet.</p>}
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <PhotoAddButtons onAdded={() => setAttempt((n) => n + 1)} />
      {photos && photos.length > 0 && (
        <div className="flex gap-2">
          <Link to="/photos" className="btn-secondary btn-sm flex-1" aria-label={`All photos, ${photos.length}`}>
            All ({photos.length})
          </Link>
          {photos.length > 1 && (
            <Link to="/photos?compare=1" className="btn-secondary btn-sm flex-1" aria-label="Compare two photos side by side">
              Compare
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
