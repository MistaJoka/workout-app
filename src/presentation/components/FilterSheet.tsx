import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSheetFocus } from './useSheetFocus'

// Filter chips are tapped repeatedly while narrowing a list, unlike a
// one-time search-input tap, so they live in a reachable bottom sheet
// (same pattern as ProfileSwitcher) behind a low, thumb-reachable trigger,
// instead of a row fixed to the top of the screen.
export function FilterSheet({
  activeCount,
  children,
  // Default clears the tab bar. Pass a taller offset when another fixed
  // bar (e.g. a bottom Cancel/Save bar) sits below this trigger too.
  triggerBottomClassName = 'bottom-20',
  // Inline: the trigger sits in the layout (e.g. beside a search box)
  // instead of floating over the list, where it covered rows.
  inline = false,
}: {
  activeCount: number
  children: React.ReactNode
  triggerBottomClassName?: string
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, () => setOpen(false), { enabled: open })
  const label = `Filters${activeCount > 0 ? ` (${activeCount})` : ''}`

  return (
    <>
      {inline ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={`flex h-11 flex-none items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold ${
            activeCount > 0 ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
          }`}
        >
          <FilterIcon />
          <span>{activeCount > 0 ? activeCount : 'Filter'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed ${triggerBottomClassName} right-4 z-20 min-h-11 rounded-full bg-field-primary px-4 py-2 text-sm font-bold shadow-lg`}
        >
          {label}
        </button>
      )}

      {/* Portaled so a sticky/stacked trigger row can't trap the sheet
          beneath the tab bar. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => setOpen(false)}>
            <div
              ref={sheetRef}
              className="max-h-[75vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              <p className="text-lg font-bold">Filters</p>
              {children}
              {/* Done at the bottom: the thumb is already down here after the
                  last chip. */}
              <button type="button" className="btn-primary btn-lg w-full" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}
