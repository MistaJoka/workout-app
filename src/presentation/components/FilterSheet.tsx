import { useState } from 'react'

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
}: {
  activeCount: number
  children: React.ReactNode
  triggerBottomClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed ${triggerBottomClassName} right-4 z-20 rounded-full bg-field-primary px-4 py-2 text-sm font-bold shadow-lg`}
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => setOpen(false)}>
          <div
            className="max-h-[75vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filters"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">Filters</p>
              <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  )
}
