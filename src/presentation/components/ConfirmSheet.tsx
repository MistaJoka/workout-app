import { useRef, type ReactNode } from 'react'
import { useSheetFocus } from './useSheetFocus'

// An in-page yes/no for actions that can't be undone mid-flow (ending a
// workout, leaving unsaved edits). A bottom sheet like FilterSheet and
// ProfileSwitcher, never window.confirm: a home-screen PWA's native dialog
// is jarring and blocks the page. The safe choice sits at the bottom,
// under the thumb; the destructive one has to be reached for.
export function ConfirmSheet({
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // Focus lands on the safe choice; Escape means "cancel" unless a
  // confirm is already in flight.
  useSheetFocus(sheetRef, () => {
    if (!busy) onCancel()
  }, { initialFocus: cancelRef })

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={busy ? undefined : onCancel}>
      <div
        ref={sheetRef}
        className="w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className="text-lg font-bold">{title}</p>
        {children && <div className="text-ink-muted">{children}</div>}
        {error && <p className="text-sm text-accent">{error}</p>}
        <button type="button" className="btn-danger w-full" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
