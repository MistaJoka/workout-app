import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import {
  decodeGiftLinkPayload,
  deliveredAlreadyApplied,
  giftAlreadyAccepted,
  matchRedemptionsByCode,
  type DeliveredPayload,
  type GiftPayload,
  type WishPayload,
} from '../../domain/rewards/giftLink'
import { listRewards, upsertRewardFromGift } from '../../infrastructure/db/repositories/rewardsRepository'
import { listLoveNotes, upsertLoveNoteFromGift } from '../../infrastructure/db/repositories/loveNotesRepository'
import { listRedemptions, markDeliveredByCode } from '../../infrastructure/db/repositories/redemptionsRepository'
import { activeProfile } from '../../infrastructure/profiles'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { Skeleton, SkeletonHeading } from '../components/Skeleton'
import { hasRealName } from '../greeting'

// Her side of a gift link (route `/gift?d=...`): decode what Hubby Bunny
// sent, show a preview that never reveals a locked note's actual text
// (notes still only unlock after a workout, exactly as usual -- a gift
// link is a delivery mechanism for the queue, not a shortcut around the
// surprise), and let her Accept or just look. No PIN here: receiving a
// gift is her side of this feature, not his.

type GiftState = { kind: 'gift'; payload: GiftPayload; alreadyAccepted: boolean }
type DeliveredState = {
  kind: 'delivered'
  payload: DeliveredPayload
  matchedTitles: string[]
  alreadyApplied: boolean
  nothingMatched: boolean
}
// Her wish, opened on his phone: he prices it (behind the PIN) in the shop.
type WishState = { kind: 'wish'; payload: WishPayload; grantedIds: Set<string> }
type State = { kind: 'loading' } | { kind: 'invalid' } | GiftState | DeliveredState | WishState

export function GiftPreviewScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [feedback] = useFeedbackSettings()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const encoded = params.get('d') ?? ''

  useEffect(() => {
    let cancelled = false
    async function evaluate() {
      const decoded = decodeGiftLinkPayload(encoded)
      if (!decoded.ok) {
        if (!cancelled) setState({ kind: 'invalid' })
        return
      }
      if (decoded.payload.kind === 'gift') {
        const [rewards, notes] = await Promise.all([listRewards(), listLoveNotes()])
        if (cancelled) return
        const alreadyAccepted = giftAlreadyAccepted(decoded.payload, new Set(rewards.map((r) => r.id)), new Set(notes.map((n) => n.id)))
        setState({ kind: 'gift', payload: decoded.payload, alreadyAccepted })
      } else if (decoded.payload.kind === 'wish') {
        const rewards = await listRewards()
        if (cancelled) return
        setState({ kind: 'wish', payload: decoded.payload, grantedIds: new Set(rewards.map((r) => r.id)) })
      } else {
        const redemptions = await listRedemptions()
        if (cancelled) return
        const matches = matchRedemptionsByCode(redemptions, decoded.payload.redemptionIds)
        setState({
          kind: 'delivered',
          payload: decoded.payload,
          matchedTitles: matches.map((m) => m.title),
          alreadyApplied: deliveredAlreadyApplied(matches),
          nothingMatched: matches.length === 0,
        })
      }
    }
    evaluate().catch(() => {
      if (!cancelled) setState({ kind: 'invalid' })
    })
    return () => {
      cancelled = true
    }
    // Re-evaluate only when the link itself changes; busy/error are owned
    // by the accept handlers below, not this decode effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded])

  async function handleAcceptGift(payload: GiftPayload) {
    setBusy(true)
    setError(null)
    try {
      const at = new Date().toISOString()
      for (const reward of payload.rewards) await upsertRewardFromGift(reward, at)
      for (const note of payload.notes) await upsertLoveNoteFromGift(note, at)
      playCelebration('gift', feedback)
      navigate('/rewards')
    } catch {
      setError("Couldn't add this on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleAcceptDelivered(payload: DeliveredPayload) {
    setBusy(true)
    setError(null)
    try {
      await markDeliveredByCode(payload.redemptionIds)
      playCelebration('gift', feedback)
      navigate('/rewards')
    } catch {
      setError("Couldn't mark that delivered on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const profileName = activeProfile().name

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-bold">Gift</h1>
      </div>

      {state.kind === 'loading' && (
        <Skeleton className="space-y-3">
          <SkeletonHeading />
        </Skeleton>
      )}

      {state.kind === 'invalid' && (
        <div className="card space-y-3 p-4 text-center" data-testid="gift-invalid">
          <p aria-hidden="true" className="text-4xl">
            🤔
          </p>
          <p className="font-bold">This link isn't a gift Foundation Strength can open.</p>
          <p className="text-sm text-ink-muted">It might be damaged, from a different app, or just not a gift link.</p>
        </div>
      )}

      {state.kind === 'gift' && (
        <>
          <GiftPreviewCard payload={state.payload} alreadyAccepted={state.alreadyAccepted} profileName={profileName} />
          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}
          {!state.alreadyAccepted && (
            <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={() => void handleAcceptGift(state.payload)}>
              {busy ? 'Adding…' : 'Accept'}
            </button>
          )}
          <button type="button" className="btn-ghost w-full" onClick={() => navigate('/')}>
            {state.alreadyAccepted ? 'Close' : 'Not now'}
          </button>
        </>
      )}

      {state.kind === 'wish' && (
        <>
          <div className="card space-y-3 p-4 text-center" data-testid="wish-preview">
            <p className="text-sm text-ink-muted">A wish from</p>
            <p className="text-lg font-bold">{state.payload.from}</p>
            <ul className="space-y-2 text-left">
              {state.payload.wishes.map((wish) => (
                <li key={wish.id} className="flex items-center gap-2 rounded-control bg-field-primary px-3 py-2">
                  <span aria-hidden="true" className="text-2xl">
                    {wish.emoji}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold">{wish.title}</span>
                  {state.grantedIds.has(wish.id) ? (
                    <span className="text-sm font-semibold text-primary-ink">In the shop ✓</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary min-h-11 px-3 text-sm"
                      onClick={() => navigate('/rewards', { state: { grantWish: wish } })}
                    >
                      Price it
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn-ghost w-full" onClick={() => navigate('/')}>
            Not now
          </button>
        </>
      )}

      {state.kind === 'delivered' && (
        <>
          <DeliveredPreviewCard state={state} />
          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}
          {!state.alreadyApplied && !state.nothingMatched && (
            <button
              type="button"
              className="btn-primary btn-lg w-full"
              disabled={busy}
              onClick={() => void handleAcceptDelivered(state.payload)}
            >
              {busy ? 'Marking delivered…' : 'Accept'}
            </button>
          )}
          <button type="button" className="btn-ghost w-full" onClick={() => navigate('/')}>
            {state.alreadyApplied || state.nothingMatched ? 'Close' : 'Not now'}
          </button>
        </>
      )}
    </div>
  )
}

function GiftPreviewCard({
  payload,
  alreadyAccepted,
  profileName,
}: {
  payload: GiftPayload
  alreadyAccepted: boolean
  profileName: string
}) {
  return (
    <div className="card space-y-3 p-4 text-center">
      <GiftBoxArt />
      <p className="text-sm text-ink-muted">A gift from</p>
      <p className="text-lg font-bold" data-testid="gift-from">
        {payload.from}
      </p>
      {payload.rewards.length > 0 && (
        <ul className="space-y-2 text-left" data-testid="gift-rewards">
          {payload.rewards.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-control bg-field-primary p-2">
              <span aria-hidden="true" className="text-xl">
                {r.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
              <span className="hud-num text-sm">{r.cost} 🥕</span>
            </li>
          ))}
        </ul>
      )}
      {payload.notes.length > 0 && (
        <p className="font-semibold" data-testid="gift-sealed-notes">
          💌 {payload.notes.length} sealed {payload.notes.length === 1 ? 'love note' : 'love notes'}
        </p>
      )}
      {payload.rewards.length === 0 && payload.notes.length === 0 && (
        <p className="text-sm text-ink-muted">Nothing in this gift -- it may already be fully opened.</p>
      )}
      {alreadyAccepted ? (
        <p className="text-sm font-semibold text-primary-ink" data-testid="gift-already">
          Already added.
        </p>
      ) : (
        <p className="text-sm text-ink-muted" data-testid="gift-target-profile">
          {hasRealName(profileName) ? `Adding to ${profileName}'s shop.` : 'Adding to your shop.'}
        </p>
      )}
    </div>
  )
}

function DeliveredPreviewCard({ state }: { state: DeliveredState }) {
  const { payload, matchedTitles, alreadyApplied, nothingMatched } = state
  return (
    <div className="card space-y-3 p-4 text-center">
      <p aria-hidden="true" className="text-4xl">
        ✅
      </p>
      <p className="text-lg font-bold" data-testid="delivered-from">
        {payload.from} delivered{matchedTitles.length > 0 ? ':' : ''}
      </p>
      {matchedTitles.length > 0 && (
        <ul className="space-y-1 text-left" data-testid="delivered-titles">
          {matchedTitles.map((title, i) => (
            <li key={i} className="font-semibold">
              {title} ✓
            </li>
          ))}
        </ul>
      )}
      {nothingMatched && (
        <p className="text-sm text-ink-muted" data-testid="delivered-nothing">
          Couldn't find a matching coupon on this device.
        </p>
      )}
      {!nothingMatched && alreadyApplied && (
        <p className="text-sm font-semibold text-primary-ink" data-testid="delivered-already">
          Already marked delivered.
        </p>
      )}
    </div>
  )
}

// Pixel-art gift box: a closed present with a bow, same crisp-edges SVG
// convention as LoveNoteEnvelope's envelope art.
function GiftBoxArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 28" width="140" height="122" shapeRendering="crispEdges" className="mx-auto">
      <rect x="4" y="12" width="24" height="14" fill="#ffd1e8" />
      <rect x="4" y="12" width="24" height="2" fill="#ffe3ef" />
      <rect x="4" y="24" width="24" height="2" fill="#e8749f" />
      <rect x="13" y="12" width="6" height="14" fill="#ffb8d9" />
      <rect x="2" y="8" width="28" height="5" fill="#b8a4ff" />
      <rect x="13" y="8" width="6" height="5" fill="#9f87ff" />
      <polygon points="10,8 16,8 13,2" fill="#9f87ff" />
      <polygon points="22,8 16,8 19,2" fill="#9f87ff" />
      <rect x="14" y="4" width="4" height="4" fill="#ffd1e8" />
    </svg>
  )
}
