import { RewardGlyph } from './RewardGlyph'
import { useRef, useState } from 'react'
import { giftLinkLocation } from '../appContext'
import { useSheetFocus } from './useSheetFocus'
import { EMOJI_CHOICES } from './RewardEditorSheet'
import { addWish } from '../../infrastructure/db/repositories/wishesRepository'
import { upsertRewardFromGift } from '../../infrastructure/db/repositories/rewardsRepository'
import { GIFT_LINK_VERSION, buildGiftLinkUrl, giftShareMessage, wishShareMessage } from '../../domain/rewards/giftLink'
import { workoutsFor } from '../../domain/rewards/pricing'
import { shareLink, type ShareLinkOutcome } from './shareLink'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'

// Her wishlist (domain/rewards/wishes.ts): she proposes, he prices.

export type WishLite = { id: string; title: string; emoji: string; icon?: string }

// Never the APK's internal localhost (presentation/appContext.ts).
export function linkLocation() {
  return giftLinkLocation()
}

export function ShareStatus({ outcome }: { outcome: ShareLinkOutcome | 'idle' }) {
  if (outcome === 'copied') return <p className="text-sm text-primary-ink" role="status">Link copied!</p>
  if (outcome === 'failed') return <p className="text-sm text-accent" role="alert">Couldn't share it. Try again.</p>
  return null
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useSheetFocus(ref, onClose)
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={ref}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
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

// How the person sending a wish or a thank-you is named on the other phone.
export function senderName(): string {
  const name = activeProfile().name
  return hasRealName(name) ? name.trim() : 'Your bunny'
}

// Her side, no PIN: write a wish, then optionally send it to his phone.
export function MakeWishSheet({ giverName, onDone, onClose }: { giverName: string; onDone: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[4])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState<WishLite | null>(null)
  const [outcome, setOutcome] = useState<ShareLinkOutcome | 'idle'>('idle')

  async function save() {
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    try {
      const wish = await addWish({ title, emoji })
      setMade({ id: wish.id, title: wish.title, emoji: wish.emoji, icon: wish.icon })
      onDone()
    } catch {
      setError("Couldn't save on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function send(wish: WishLite) {
    const payload = {
      v: GIFT_LINK_VERSION,
      kind: 'wish' as const,
      from: senderName(),
      wishes: [wish],
      createdAt: new Date().toISOString(),
    }
    setOutcome(await shareLink({ ...wishShareMessage(payload), url: buildGiftLinkUrl(payload, linkLocation()) }))
  }

  return (
    <Sheet label="Make a wish" onClose={onClose}>
      {!made ? (
        <>
          <p className="text-lg font-bold">Make a wish ✨</p>
          <p className="text-sm text-ink-muted">{giverName} sets the price.</p>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Wish"
            placeholder="Spa day, pizza night…"
            maxLength={60}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Wish emoji">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                className={`${emoji === e ? 'btn-primary' : 'btn-secondary'} min-h-11 min-w-11 p-0 text-xl`}
                aria-label={`Emoji ${e}`}
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn-primary btn-lg w-full" disabled={busy || !title.trim()} onClick={() => void save()}>
            Make a wish
          </button>
          <button type="button" className="btn-ghost w-full" onClick={onClose}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <div className="card space-y-1 p-4 text-center" data-testid="wish-made">
            <RewardGlyph emoji={made.emoji} icon={made.icon} size={56} variant="tile" className="mx-auto" />
            <p className="font-bold">{made.title}</p>
            <p className="text-sm text-ink-muted">Wished! Waiting for {giverName}.</p>
          </div>
          <ShareStatus outcome={outcome} />
          <button type="button" className="btn-primary btn-lg w-full" onClick={() => void send(made)}>
            Send to {giverName} 💌
          </button>
          <button type="button" className="btn-ghost w-full" onClick={onClose}>
            Done
          </button>
        </>
      )}
    </Sheet>
  )
}

const PRICE_PRESETS = [
  { label: 'Little', cost: 25 },
  { label: 'Bigger', cost: 60 },
  { label: 'Big', cost: 150 },
] as const

// His side, after the PIN: price her wish. The reward takes the wish's id,
// which is what marks the wish granted. On his own phone he then sends it
// back as a gift link; on hers it's already in the shop.
export function GrantWishSheet({
  wish,
  giverName,
  onGranted,
  onNotNow,
  onClose,
}: {
  wish: WishLite
  giverName: string
  onGranted: () => void
  onNotNow: () => void
  onClose: () => void
}) {
  const [cost, setCost] = useState(25)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [granted, setGranted] = useState(false)
  const [outcome, setOutcome] = useState<ShareLinkOutcome | 'idle'>('idle')

  async function grant() {
    setBusy(true)
    setError(null)
    try {
      await upsertRewardFromGift({ ...wish, cost })
      setGranted(true)
      onGranted()
    } catch {
      setError("Couldn't save on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function sendBack() {
    const payload = {
      v: GIFT_LINK_VERSION,
      kind: 'gift' as const,
      from: giverName,
      rewards: [{ ...wish, cost }],
      notes: [],
      createdAt: new Date().toISOString(),
    }
    setOutcome(await shareLink({ ...giftShareMessage(payload), url: buildGiftLinkUrl(payload, linkLocation()) }))
  }

  const workouts = workoutsFor(cost)
  return (
    <Sheet label={`Price the wish: ${wish.title}`} onClose={onClose}>
      <div className="card space-y-1 p-4 text-center">
        <RewardGlyph emoji={wish.emoji} icon={wish.icon} size={56} variant="tile" className="mx-auto" />
        <p className="font-bold">{wish.title}</p>
        <p className="text-sm text-ink-muted">{granted ? 'In the shop! ✨' : 'A wish'}</p>
      </div>
      {!granted ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Price</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary min-h-11 min-w-11 p-0"
                aria-label="Fewer carrots"
                onClick={() => setCost((c) => Math.max(5, c - 5))}
              >
                −
              </button>
              <span className="hud-num w-20 text-center text-lg font-bold">{cost} 🥕</span>
              <button type="button" className="btn-secondary min-h-11 min-w-11 p-0" aria-label="More carrots" onClick={() => setCost((c) => c + 5)}>
                +
              </button>
            </div>
          </div>
          <p className="text-right text-sm text-ink-muted" data-testid="wish-cost-in-workouts">
            ≈ {workouts} {workouts === 1 ? 'workout' : 'workouts'}
          </p>
          <div className="flex gap-2" role="group" aria-label="Quick prices">
            {PRICE_PRESETS.map((p) => (
              <button
                key={p.cost}
                type="button"
                className={`${cost === p.cost ? 'btn-primary' : 'btn-secondary'} min-h-11 flex-1 px-2 text-sm`}
                aria-pressed={cost === p.cost}
                onClick={() => setCost(p.cost)}
              >
                {p.label} {p.cost}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={() => void grant()}>
            Add to the shop
          </button>
          <button type="button" className="btn-ghost w-full" onClick={onNotNow}>
            Not now
          </button>
        </>
      ) : (
        <>
          <ShareStatus outcome={outcome} />
          <button type="button" className="btn-secondary w-full min-h-11" onClick={() => void sendBack()}>
            On your own phone? Send it back 💌
          </button>
          <button type="button" className="btn-primary btn-lg w-full" onClick={onClose}>
            Done
          </button>
        </>
      )}
    </Sheet>
  )
}
