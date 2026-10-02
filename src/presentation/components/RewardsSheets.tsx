import { useRef, useState, type ReactNode } from 'react'
import { useSheetFocus } from './useSheetFocus'
import { isValidPin } from '../../domain/rewards/pin'
import { CarrotBurst } from './CarrotCelebration'

// Bottom sheets for Hubby Bunny's reward shop: setting/entering his PIN,
// confirming a redemption, and the coupon that comes out of it. Same
// backdrop/focus-trap convention as ConfirmSheet/EmblemSheet
// (useSheetFocus, `sheet-backdrop`, safe-area padding).

function SheetShell({
  label,
  busy,
  onCancel,
  children,
}: {
  label: string
  busy?: boolean
  onCancel: () => void
  children: ReactNode
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, () => {
    if (!busy) onCancel()
  })
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={busy ? undefined : onCancel}>
      <div
        ref={sheetRef}
        className="w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  )
}

function PinInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      className="input text-center text-2xl tracking-[0.5em]"
      aria-label={label}
      placeholder="••••"
    />
  )
}

// First-time setup, from Settings -> "Hubby's reward shop". Sets the PIN
// and (optionally) renames the giver away from the "Hubby Bunny" default.
export function PinSetupSheet({
  giverNameInitial,
  busy,
  error,
  onSave,
  onCancel,
}: {
  giverNameInitial: string
  busy: boolean
  error: string | null
  onSave: (pin: string, giverName: string) => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [giverName, setGiverName] = useState(giverNameInitial)
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSave() {
    if (!isValidPin(pin)) {
      setLocalError('Pick a 4-digit PIN.')
      return
    }
    if (pin !== confirm) {
      setLocalError("PINs don't match.")
      return
    }
    setLocalError(null)
    onSave(pin, giverName.trim() || giverNameInitial)
  }

  return (
    <SheetShell label="Set a PIN for the reward shop" busy={busy} onCancel={onCancel}>
      <p className="text-lg font-bold">Set a PIN</p>
      <p className="text-sm text-ink-muted">
        This guards editing the shop and marking coupons delivered. Only you need to remember it.
      </p>
      <label className="block space-y-1 text-left">
        <span className="text-sm font-semibold">Your name, as the giver</span>
        <input
          type="text"
          value={giverName}
          onChange={(e) => setGiverName(e.target.value)}
          className="input"
          aria-label="Your name, as the giver"
          placeholder={giverNameInitial}
        />
      </label>
      <div className="flex justify-center gap-3">
        <PinInput value={pin} onChange={setPin} label="New PIN" />
        <PinInput value={confirm} onChange={setConfirm} label="Confirm PIN" />
      </div>
      {(localError ?? error) && (
        <p className="text-sm text-accent" role="alert">
          {localError ?? error}
        </p>
      )}
      <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={handleSave}>
        {busy ? 'Saving…' : 'Save PIN'}
      </button>
      <button type="button" className="btn-ghost w-full" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </SheetShell>
  )
}

// Entering the PIN to unlock hubby controls (editing the shop, marking a
// coupon delivered) for the rest of this visit to the shop.
export function PinEntrySheet({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  error: string | null
  onSubmit: (pin: string) => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  return (
    <SheetShell label="Enter the reward-shop PIN" busy={busy} onCancel={onCancel}>
      <p className="text-lg font-bold">Enter PIN</p>
      <div className="flex justify-center">
        <PinInput value={pin} onChange={setPin} label="PIN" />
      </div>
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn-primary btn-lg w-full"
        disabled={busy || !isValidPin(pin)}
        onClick={() => onSubmit(pin)}
      >
        {busy ? 'Checking…' : 'Unlock'}
      </button>
      <button type="button" className="btn-ghost w-full" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </SheetShell>
  )
}

// Confirms spending carrots on a reward before it's redeemed (can't be
// undone -- the carrots are spent and a coupon is minted).
export function RedeemConfirmSheet({
  title,
  emoji,
  cost,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  emoji: string
  cost: number
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <SheetShell label={`Redeem ${title}`} busy={busy} onCancel={onCancel}>
      <p className="text-lg font-bold">
        Redeem {emoji} {title}?
      </p>
      <p className="text-sm text-ink-muted">{cost} 🥕 will be spent. This makes a coupon to send.</p>
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={onConfirm}>
        {busy ? 'Redeeming…' : `Redeem for ${cost} 🥕`}
      </button>
      <button type="button" className="btn-ghost w-full" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </SheetShell>
  )
}

// The coupon itself, just after redeeming: share it to Hubby Bunny, or (if
// already in hubby mode) mark it delivered right away.
export function CouponSheet({
  title,
  emoji,
  cost,
  giverName,
  deliveredAt,
  shareBusy,
  shareError,
  onShare,
  onMarkDelivered,
  onClose,
}: {
  title: string
  emoji: string
  cost: number
  giverName: string
  deliveredAt: string | null
  shareBusy: boolean
  shareError: string | null
  onShare: () => void
  onMarkDelivered: () => void
  onClose: () => void
}) {
  return (
    <SheetShell label="Your coupon" onCancel={onClose}>
      <div className="relative mx-auto flex max-w-[16rem] flex-col items-center gap-1 rounded-panel bg-field-notice px-4 py-6" data-testid="coupon-card">
        <CarrotBurst />
        <span aria-hidden="true" className="text-5xl">
          {emoji}
        </span>
        <p className="text-xl font-extrabold">{title}</p>
        <p className="hud-num text-lg font-bold">{cost} 🥕</p>
        <p className="text-sm text-ink-muted">Redeemable with {giverName}</p>
        {deliveredAt && <p className="text-sm font-semibold text-primary-ink">Delivered!</p>}
      </div>
      {shareError && (
        <p className="text-sm text-accent" role="alert">
          {shareError}
        </p>
      )}
      <button type="button" className="btn-secondary w-full" disabled={shareBusy} onClick={onShare}>
        {shareBusy ? 'Making your coupon…' : `Send to ${giverName}`}
      </button>
      {!deliveredAt && (
        <button type="button" className="btn-primary w-full" onClick={onMarkDelivered}>
          Hubby: mark delivered
        </button>
      )}
      <button type="button" className="btn-ghost w-full" onClick={onClose}>
        Close
      </button>
    </SheetShell>
  )
}
