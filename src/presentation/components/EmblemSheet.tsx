import { useRef } from 'react'
import { useSheetFocus } from './useSheetFocus'
import { PixelBloom } from './PixelBloom'
import type { GardenSpecies } from '../../domain/progress/garden'

// Settings -> You -> Emblem: pick a flower you've already grown to stand
// in for the plain initial circle (picker cards, the profile switcher,
// Today's greeting). Same bottom-sheet pattern as ConfirmSheet/FilterSheet.
// Only already-discovered species are offered — an ungrown flower can't be
// chosen as identity before it exists in the garden.
export function EmblemSheet({
  species,
  selected,
  onSelect,
  onCancel,
}: {
  species: readonly GardenSpecies[]
  selected: string | null
  onSelect: (emblem: string | null) => void
  onCancel: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onCancel)

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onCancel}>
      <div
        ref={sheetRef}
        className="max-h-[80vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose an emblem"
      >
        <p className="text-lg font-bold">Emblem</p>
        <p className="text-sm text-ink-muted">A flower you've grown, to stand in for your initial.</p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            aria-pressed={selected === null}
            onClick={() => onSelect(null)}
            className={`card flex min-h-11 flex-col items-center gap-1 p-2 ${selected === null ? 'ring-2 ring-primary' : ''}`}
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-field-info text-sm font-extrabold"
            >
              ?
            </span>
            <span className="text-xs font-semibold">None</span>
          </button>
          {species.map((sp) => (
            <button
              key={sp.id}
              type="button"
              aria-pressed={selected === sp.id}
              onClick={() => onSelect(sp.id)}
              className={`card flex min-h-11 flex-col items-center gap-1 p-2 ${selected === sp.id ? 'ring-2 ring-primary' : ''}`}
            >
              <span aria-hidden="true">
                <PixelBloom size={36} animate={false} species={sp} />
              </span>
              <span className="line-clamp-1 text-center text-xs font-semibold leading-tight">{sp.name}</span>
            </button>
          ))}
        </div>

        {species.length === 0 && (
          <p className="text-sm text-ink-muted">Finish a workout to grow your first flower, then come back here.</p>
        )}

        <button type="button" className="btn-secondary w-full" onClick={onCancel}>
          Close
        </button>
      </div>
    </div>
  )
}
