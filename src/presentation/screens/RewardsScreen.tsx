import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import type { RedemptionRecord, RewardRecord } from '../../infrastructure/db/schema'
import { listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { addReward, updateReward, removeReward } from '../../infrastructure/db/repositories/rewardsRepository'
import { listRedemptions, markDelivered, redeemReward } from '../../infrastructure/db/repositories/redemptionsRepository'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import {
  DEFAULT_GIVER_NAME,
  INITIAL_PIN_ATTEMPT_STATE,
  createPinRecord,
  isInPinCooldown,
  isValidPin,
  pinCooldownMessage,
  recordCorrectPinAttempt,
  recordWrongPinAttempt,
  remainingCooldownMs,
  verifyPin,
  type PinAttemptState,
  type PinRecord,
} from '../../domain/rewards/pin'
import { generateSalt, hasSubtleCrypto, sha256Hex } from '../../infrastructure/pinCrypto'
import { loadCarrotBalance } from '../components/CarrotCelebration'
import { PinEntrySheet, PinSetupSheet, RedeemConfirmSheet, CouponSheet } from '../components/RewardsSheets'
import { RewardEditorSheet, type RewardDraft } from '../components/RewardEditorSheet'
import { GiftComposerSheet } from '../components/GiftComposerSheet'
import { DeliveredComposerSheet } from '../components/DeliveredComposerSheet'
import { OpenGiftLink } from '../components/OpenGiftLink'
import { SAVING_FOR_KEY, SavingGoalBar, savingGoalReward } from '../components/SavingGoal'
import { rewardTier, type RewardTier } from '../../domain/rewards/pricing'
import { newId } from '../../shared/id'
import { GrantWishSheet, MakeWishSheet, type WishLite } from '../components/WishSheets'
import { dismissWish, getWishBook } from '../../infrastructure/db/repositories/wishesRepository'
import { grantedWishIds, pendingWishes, type WishBook } from '../../domain/rewards/wishes'
import { renderCardToBlob, ShareIcon } from '../components/ShareCardButton'
import { shareOrDownload } from '../components/shareOrDownload'
import { buildCouponCardModel, couponCardFilename, drawCouponCard } from '../rewardsCard'
import { couponShareMessage, shortRedemptionCode } from '../../domain/rewards/giftLink'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { Skeleton, SkeletonTiles } from '../components/Skeleton'
import { HubbyModePill, isHubbyUnlocked, touchHubbySession, unlockHubbySession, useHubbySession } from '../components/hubbySession'

const GIVER_NAME_KEY = 'rewardsGiverName'
const PIN_KEY = 'rewardsHubbyPin'
const PIN_ATTEMPTS_KEY = 'rewardsHubbyPinAttempts'

type PinPurpose = 'manage' | 'giftCompose' | 'deliverCompose' | { deliver: string } | { grant: WishLite }

type Sheet =
  | { kind: 'none' }
  | { kind: 'pinSetup'; purpose: PinPurpose }
  | { kind: 'pinEntry'; purpose: PinPurpose }
  | { kind: 'editor' }
  | { kind: 'giftCompose' }
  | { kind: 'deliverCompose' }
  | { kind: 'redeemConfirm'; reward: RewardRecord; attemptId: string }
  | { kind: 'makeWish' }
  | { kind: 'grantWish'; wish: WishLite }
  | { kind: 'coupon'; redemption: RedemptionRecord; emoji: string }

type Data = {
  rewards: RewardRecord[]
  redemptions: RedemptionRecord[]
  balance: number
  giverName: string
  pin: PinRecord | null
  pinAttempts: PinAttemptState
  savingFor: string | null
  wishes: WishBook
}

async function load(): Promise<Data> {
  const [rewards, redemptions, balance, giverName, pin, pinAttempts, savingFor, wishes] = await Promise.all([
    listRewards(),
    listRedemptions(),
    loadCarrotBalance(),
    getSetting<string>(GIVER_NAME_KEY),
    getSetting<PinRecord>(PIN_KEY),
    getSetting<PinAttemptState>(PIN_ATTEMPTS_KEY),
    getSetting<string | null>(SAVING_FOR_KEY),
    getWishBook(),
  ])
  return {
    rewards,
    redemptions,
    balance,
    giverName: giverName ?? DEFAULT_GIVER_NAME,
    pin: pin ?? null,
    pinAttempts: pinAttempts ?? INITIAL_PIN_ATTEMPT_STATE,
    savingFor: savingFor ?? null,
    wishes,
  }
}

export function RewardsScreen() {
  const location = useLocation()
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [redeemBusy, setRedeemBusy] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorBusyId, setEditorBusyId] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [deliverError, setDeliverError] = useState<string | null>(null)
  const [feedback] = useFeedbackSettings()
  // Hubby mode: once he's entered the PIN, these gated actions don't ask
  // again for the rest of this visit to the rewards area (task: see
  // presentation/components/hubbySession.tsx).
  const hubby = useHubbySession()

  useEffect(() => {
    let cancelled = false
    load()
      .then((loaded) => {
        if (cancelled) return
        setData(loaded)
        // Settings -> "Hubby's reward shop" hands off here to start setup
        // right away, instead of landing on the plain shop view first.
        // A wish link opened on his phone hands its wish over to price.
        const grantWish = (location.state as { grantWish?: WishLite } | null)?.grantWish
        if (grantWish) {
          if (!loaded.pin) setSheet({ kind: 'pinSetup', purpose: { grant: grantWish } })
          else setSheet(isHubbyUnlocked() ? { kind: 'grantWish', wish: grantWish } : { kind: 'pinEntry', purpose: { grant: grantWish } })
        } else if ((location.state as { openManage?: boolean } | null)?.openManage) {
          if (!loaded.pin) setSheet({ kind: 'pinSetup', purpose: 'manage' })
          else setSheet(isHubbyUnlocked() ? { kind: 'editor' } : { kind: 'pinEntry', purpose: 'manage' })
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // Only ever consulted once, right after the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh(): Promise<Data> {
    const loaded = await load()
    setData(loaded)
    return loaded
  }

  // Every PIN-gated entry point (managing the shop, the two gift-link
  // composers, and marking one redemption delivered from here) goes through
  // the same pinEntry/pinSetup sheets -- only `purpose` says where to land
  // once the PIN checks out.
  function requestPinFor(purpose: PinPurpose) {
    setPinError(null)
    if (!data?.pin) {
      setSheet({ kind: 'pinSetup', purpose })
    } else if (isHubbyUnlocked()) {
      // Hubby mode is on: skip the PIN and go straight where it was headed.
      if (typeof purpose === 'object' && 'deliver' in purpose) void performMarkDelivered(purpose.deliver)
      else setSheet(landOnPurpose(purpose))
    } else {
      setSheet({ kind: 'pinEntry', purpose })
    }
  }

  function openManage() {
    requestPinFor('manage')
  }

  function landOnPurpose(purpose: PinPurpose): Sheet {
    if (typeof purpose === 'object') return 'grant' in purpose ? { kind: 'grantWish', wish: purpose.grant } : { kind: 'none' }
    if (purpose === 'manage') return { kind: 'editor' }
    if (purpose === 'giftCompose') return { kind: 'giftCompose' }
    if (purpose === 'deliverCompose') return { kind: 'deliverCompose' }
    return { kind: 'none' }
  }

  async function handleSetPin(pin: string, giverName: string, purpose: PinPurpose) {
    setPinBusy(true)
    setPinError(null)
    try {
      const algorithm = hasSubtleCrypto() ? 'sha256' : 'fallback'
      const record = await createPinRecord(pin, generateSalt(), sha256Hex, algorithm)
      await setSetting(PIN_KEY, record)
      await setSetting(GIVER_NAME_KEY, giverName)
      await setSetting(PIN_ATTEMPTS_KEY, recordCorrectPinAttempt())
      unlockHubbySession()
      await refresh()
      if (typeof purpose === 'object' && 'deliver' in purpose) {
        await markDelivered(purpose.deliver)
        await refresh()
        setSheet({ kind: 'none' })
      } else {
        setSheet(landOnPurpose(purpose))
      }
    } catch {
      setPinError("Couldn't save on this device. Try again.")
    } finally {
      setPinBusy(false)
    }
  }

  async function handlePinSubmit(pin: string, purpose: PinPurpose) {
    if (!data?.pin) return
    const now = new Date()
    const attempts = data.pinAttempts
    if (isInPinCooldown(attempts, now)) {
      setPinError(pinCooldownMessage(remainingCooldownMs(attempts, now)))
      return
    }
    setPinBusy(true)
    setPinError(null)
    try {
      const ok = await verifyPin(pin, data.pin, sha256Hex)
      if (!ok) {
        const next = recordWrongPinAttempt(attempts, now)
        await setSetting(PIN_ATTEMPTS_KEY, next)
        await refresh()
        setPinError(isInPinCooldown(next, now) ? pinCooldownMessage(remainingCooldownMs(next, now)) : 'Wrong PIN.')
        return
      }
      await setSetting(PIN_ATTEMPTS_KEY, recordCorrectPinAttempt())
      unlockHubbySession()
      if (typeof purpose === 'object' && 'deliver' in purpose) {
        await markDelivered(purpose.deliver)
        await refresh()
        setSheet({ kind: 'none' })
      } else {
        setSheet(landOnPurpose(purpose))
      }
    } catch {
      setPinError("Couldn't check that on this device. Try again.")
    } finally {
      setPinBusy(false)
    }
  }

  async function performMarkDelivered(redemptionId: string) {
    setDeliverError(null)
    try {
      await markDelivered(redemptionId)
      touchHubbySession()
      await refresh()
      setSheet({ kind: 'none' })
    } catch {
      setDeliverError("Couldn't mark that delivered on this device. Try again.")
    }
  }

  function requestMarkDelivered(redemptionId: string) {
    requestPinFor({ deliver: redemptionId })
  }

  async function handleAdd(draft: RewardDraft) {
    setEditorError(null)
    touchHubbySession()
    try {
      await addReward(draft)
      await refresh()
    } catch {
      setEditorError("Couldn't save on this device. Try again.")
    }
  }

  async function handleUpdate(id: string, patch: Partial<Pick<RewardRecord, 'title' | 'cost' | 'emoji' | 'active'>>) {
    setEditorError(null)
    touchHubbySession()
    try {
      await updateReward(id, patch)
      await refresh()
    } catch {
      setEditorError("Couldn't save on this device. Try again.")
    }
  }

  async function handleRemove(id: string) {
    setEditorError(null)
    setEditorBusyId(id)
    touchHubbySession()
    try {
      await removeReward(id)
      await refresh()
    } catch {
      setEditorError("Couldn't remove it on this device. Try again.")
    } finally {
      setEditorBusyId(null)
    }
  }

  // `attemptId` comes from the confirm sheet (one per opening): a double tap
  // or retry lands on the same redemption. The balance is re-read fresh, so
  // a stale screen (say, a second tab that already spent it) can't overspend.
  async function handleRedeem(reward: RewardRecord, attemptId: string) {
    setRedeemBusy(true)
    setRedeemError(null)
    try {
      const alreadyRedeemed = data?.redemptions.some((r) => r.id === attemptId)
      if (!alreadyRedeemed && (await loadCarrotBalance()) < reward.cost) {
        await refresh()
        setRedeemError('Not enough carrots for this one yet.')
        return
      }
      const redemption = await redeemReward(reward, undefined, attemptId)
      if (data?.savingFor === reward.id) await setSetting(SAVING_FOR_KEY, null)
      playCelebration('redeem', feedback)
      await refresh()
      setSheet({ kind: 'coupon', redemption, emoji: reward.emoji })
    } catch {
      setRedeemError("Couldn't redeem that on this device. Try again.")
    } finally {
      setRedeemBusy(false)
    }
  }

  async function handleShareCoupon(redemption: RedemptionRecord, emoji: string) {
    if (!data) return
    setShareBusy(true)
    setShareError(null)
    try {
      const profileName = activeProfile().name
      const model = buildCouponCardModel({
        title: redemption.title,
        emoji,
        cost: redemption.cost,
        redeemedAt: redemption.redeemedAt,
        giverName: data.giverName,
        ...(hasRealName(profileName) ? { name: profileName.trim() } : {}),
      })
      const blob = await renderCardToBlob((ctx) => drawCouponCard(ctx, model))
      // The share message's own text carries a short coupon code (never
      // just the image) -- it's the thing Hubby Bunny pastes into his own
      // phone's "Mark delivered" composer (gift links round trip).
      const message = couponShareMessage({
        title: redemption.title,
        emoji,
        giverName: data.giverName,
        code: shortRedemptionCode(redemption.id),
      })
      await shareOrDownload(blob, couponCardFilename(redemption.redeemedAt), 'image/png', message)
    } catch {
      setShareError("Couldn't make the coupon on this device. Try again.")
    } finally {
      setShareBusy(false)
    }
  }

  function openRedeem(reward: RewardRecord) {
    setRedeemError(null)
    setSheet({ kind: 'redeemConfirm', reward, attemptId: newId() })
  }

  async function handleDismissWish(id: string) {
    try {
      await dismissWish(id)
      await refresh()
      setSheet({ kind: 'none' })
    } catch {
      setRedeemError("Couldn't save that on this device. Try again.")
    }
  }

  // Her choice, no PIN: pin one reward to save for, or tap again to unpin.
  async function toggleSavingFor(reward: RewardRecord) {
    try {
      await setSetting(SAVING_FOR_KEY, data?.savingFor === reward.id ? null : reward.id)
      await refresh()
    } catch {
      setRedeemError("Couldn't save that on this device. Try again.")
    }
  }

  function openCoupon(redemption: RedemptionRecord) {
    const reward = data?.rewards.find((r) => r.id === redemption.rewardId)
    setShareError(null)
    setSheet({ kind: 'coupon', redemption, emoji: reward?.emoji ?? '🥕' })
  }

  const activeRewards = [...(data?.rewards.filter((r) => r.active) ?? [])].sort((a, b) => a.cost - b.cost)
  const goalReward = data ? savingGoalReward(data.rewards, data.savingFor) : null
  const rewardIds = new Set(data?.rewards.map((r) => r.id) ?? [])
  const wishesPending = pendingWishes(data?.wishes, rewardIds)
  const wishesGranted = grantedWishIds(data?.wishes, rewardIds)
  const pending = data?.redemptions.filter((r) => !r.deliveredAt) ?? []
  const delivered = data?.redemptions.filter((r) => r.deliveredAt) ?? []

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-bold">{data ? `${data.giverName}'s shop` : 'Shop'}</h1>
      </div>

      <HubbyModePill unlocked={hubby.unlocked} onLock={hubby.lock} />

      {deliverError && (
        <p className="text-sm text-accent" role="alert">
          {deliverError}
        </p>
      )}

      {data === null && !failed && (
        <Skeleton className="space-y-4">
          <SkeletonTiles count={2} />
        </Skeleton>
      )}
      {data === null && failed && (
        <div className="card space-y-3 p-4 text-center">
          <p className="font-bold">Couldn't load the shop.</p>
          <button type="button" className="btn-primary w-full" onClick={() => void refresh().catch(() => setFailed(true))}>
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <section className="card flex items-center justify-between gap-2 p-4" data-testid="rewards-balance">
            <span>
              <span className="block text-sm text-ink-muted">Your carrots</span>
              <span className="hud-num text-3xl font-bold">{data.balance} 🥕</span>
            </span>
            <button type="button" className="btn-secondary min-h-11 px-4" onClick={openManage}>
              {data.pin ? 'Manage shop' : 'Set up shop'}
            </button>
          </section>

          {activeRewards.length === 0 ? (
            <RaeNote expression="smile">
              {data.giverName} hasn't added anything to the shop yet. Tap "{data.pin ? 'Manage shop' : 'Set up shop'}" to add
              the first reward.
            </RaeNote>
          ) : (
            <>
              {goalReward && (
                <section className="card flex items-center gap-3 p-4" data-testid="saving-goal">
                  <span aria-hidden="true" className="text-3xl">
                    {goalReward.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink-muted">Saving for</span>
                    <span className="block truncate font-bold">{goalReward.title}</span>
                    <SavingGoalBar reward={goalReward} balance={data.balance} />
                  </span>
                </section>
              )}
              <div className="grid grid-cols-2 gap-3">
                {activeRewards.map((reward) => (
                  <RewardTile
                    key={reward.id}
                    reward={reward}
                    balance={data.balance}
                    saving={data.savingFor === reward.id}
                    wished={wishesGranted.has(reward.id)}
                    onRedeem={() => openRedeem(reward)}
                    onToggleSaving={() => void toggleSavingFor(reward)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Her wishlist: she proposes, he prices behind the PIN. */}
          <section className="space-y-2" data-testid="wishlist">
            {wishesPending.length > 0 && <p className="text-sm font-semibold text-ink-muted">Wishes</p>}
            {wishesPending.map((wish) => (
              <div key={wish.id} className="card flex items-center gap-2 p-3">
                <span aria-hidden="true" className="text-2xl">
                  {wish.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{wish.title}</span>
                  <span className="block text-xs text-ink-muted">Waiting for {data.giverName}</span>
                </span>
                <button
                  type="button"
                  className="btn-secondary min-h-11 px-3 text-sm"
                  aria-label={`Hubby: price ${wish.title}`}
                  onClick={() => requestPinFor({ grant: { id: wish.id, title: wish.title, emoji: wish.emoji } })}
                >
                  Price it
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-11 min-w-11 p-0"
                  aria-label={`Remove wish ${wish.title}`}
                  onClick={() => void handleDismissWish(wish.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary min-h-11 w-full" onClick={() => setSheet({ kind: 'makeWish' })}>
              Make a wish ✨
            </button>
          </section>

          {data.redemptions.length > 0 && (
            <section className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">Pending</p>
              {pending.length === 0 ? (
                <p className="text-sm text-ink-muted">Nothing waiting on {data.giverName} right now.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((r) => (
                    <RedemptionRow key={r.id} redemption={r} onOpen={() => openCoupon(r)} onMarkDelivered={() => requestMarkDelivered(r.id)} />
                  ))}
                </ul>
              )}
              {delivered.length > 0 && (
                <>
                  <p className="pt-2 text-sm font-semibold text-ink-muted">Delivered</p>
                  <ul className="space-y-2">
                    {delivered.map((r) => (
                      <RedemptionRow key={r.id} redemption={r} onOpen={() => openCoupon(r)} onMarkDelivered={() => requestMarkDelivered(r.id)} />
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* A sibling surprise, reachable from here: Hubby Bunny's love
              notes, written and unlocked separately from the shop's
              carrot-spending flow. */}
          <Link to="/notes" className="card flex min-h-11 items-center gap-3 p-4" aria-label="Love notes. Open your love notes">
            <span aria-hidden="true" className="text-2xl">
              💌
            </span>
            <span className="flex-1 font-semibold">Love notes</span>
            <span aria-hidden="true" className="text-xl text-ink-muted">
              ›
            </span>
          </Link>

          {/* Gift links (domain/rewards/giftLink.ts): Hubby Bunny can do
              both of these from his own phone, with no access to her data
              at all -- "Send to her" composes rewards/notes into a link;
              "Mark delivered" turns a coupon code she sent him into a
              link that marks it delivered on her phone. Both PIN-gated,
              same gate as managing the shop. */}
          <div className="flex gap-2">
            {/* Deliberately not "Send to ___": CouponSheet's own "Send to
                {giverName}" button can be open on top of this same screen,
                and e2e matches that button by a `/^Send to/` prefix. */}
            <button type="button" className="btn-secondary min-h-11 flex-1" onClick={() => requestPinFor('giftCompose')}>
              Send a gift 💌
            </button>
            <button type="button" className="btn-secondary min-h-11 flex-1" onClick={() => requestPinFor('deliverCompose')}>
              Mark delivered
            </button>
          </div>

          <OpenGiftLink />
        </>
      )}

      {sheet.kind === 'pinSetup' && (
        <PinSetupSheet
          giverNameInitial={data?.giverName ?? DEFAULT_GIVER_NAME}
          busy={pinBusy}
          error={pinError}
          onSave={(pin, name) => void handleSetPin(pin, name, sheet.purpose)}
          onCancel={() => setSheet({ kind: 'none' })}
        />
      )}

      {sheet.kind === 'pinEntry' && (
        <PinEntrySheet busy={pinBusy} error={pinError} onSubmit={(pin) => void handlePinSubmit(pin, sheet.purpose)} onCancel={() => setSheet({ kind: 'none' })} />
      )}

      {sheet.kind === 'editor' && data && (
        <RewardEditorSheet
          rewards={data.rewards}
          giverName={data.giverName}
          busyId={editorBusyId}
          error={editorError}
          onAdd={(draft) => void handleAdd(draft)}
          onUpdate={(id, patch) => void handleUpdate(id, patch)}
          onRemove={(id) => void handleRemove(id)}
          onClose={() => setSheet({ kind: 'none' })}
        />
      )}

      {sheet.kind === 'giftCompose' && data && (
        <GiftComposerSheet giverName={data.giverName} onClose={() => setSheet({ kind: 'none' })} />
      )}

      {sheet.kind === 'deliverCompose' && data && (
        <DeliveredComposerSheet giverName={data.giverName} onClose={() => setSheet({ kind: 'none' })} />
      )}

      {sheet.kind === 'makeWish' && data && (
        <MakeWishSheet giverName={data.giverName} onDone={() => void refresh()} onClose={() => setSheet({ kind: 'none' })} />
      )}

      {sheet.kind === 'grantWish' && data && (
        <GrantWishSheet
          wish={sheet.wish}
          giverName={data.giverName}
          onGranted={() => {
            touchHubbySession()
            void refresh()
          }}
          onNotNow={() => void handleDismissWish(sheet.wish.id)}
          onClose={() => setSheet({ kind: 'none' })}
        />
      )}

      {sheet.kind === 'redeemConfirm' && (
        <RedeemConfirmSheet
          title={sheet.reward.title}
          emoji={sheet.reward.emoji}
          cost={sheet.reward.cost}
          busy={redeemBusy}
          error={redeemError}
          onConfirm={() => void handleRedeem(sheet.reward, sheet.attemptId)}
          onCancel={() => setSheet({ kind: 'none' })}
        />
      )}

      {sheet.kind === 'coupon' && data && (
        <CouponSheet
          title={sheet.redemption.title}
          emoji={sheet.emoji}
          cost={sheet.redemption.cost}
          giverName={data.giverName}
          deliveredAt={sheet.redemption.deliveredAt}
          shareBusy={shareBusy}
          shareError={shareError}
          onShare={() => void handleShareCoupon(sheet.redemption, sheet.emoji)}
          onMarkDelivered={() => requestMarkDelivered(sheet.redemption.id)}
          onClose={() => setSheet({ kind: 'none' })}
        />
      )}
    </div>
  )
}

// A small tag on each tile; the grid itself stays one list, cheapest first.
const TIER_LABELS: Record<RewardTier, string> = { small: 'Little treat', medium: 'Bigger treat', big: 'Big dream' }

function RewardTile({
  reward,
  balance,
  saving,
  wished,
  onRedeem,
  onToggleSaving,
}: {
  reward: RewardRecord
  balance: number
  saving: boolean
  wished: boolean
  onRedeem: () => void
  onToggleSaving: () => void
}) {
  const affordable = balance >= reward.cost
  const pct = reward.cost > 0 ? Math.min(100, Math.round((balance / reward.cost) * 100)) : 100
  return (
    <div className="card space-y-2 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{TIER_LABELS[rewardTier(reward.cost)]}</p>
      <span aria-hidden="true" className="text-3xl">
        {reward.emoji}
      </span>
      <p className="font-bold leading-tight">{reward.title}</p>
      {wished && <p className="text-xs font-semibold text-primary-ink">✨ Your wish</p>}
      <p className="hud-num text-sm text-ink-muted">{reward.cost} 🥕</p>
      {affordable ? (
        <button type="button" className="btn-primary min-h-11 w-full" onClick={onRedeem}>
          Redeem
        </button>
      ) : (
        <div className="space-y-1" aria-label={`${reward.cost - balance} more carrots needed`}>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
            />
          </div>
          <p className="text-xs text-ink-muted">{reward.cost - balance} more 🥕</p>
          <button
            type="button"
            className={`${saving ? 'btn-primary' : 'btn-secondary'} min-h-11 w-full text-sm`}
            aria-pressed={saving}
            onClick={onToggleSaving}
          >
            {saving ? 'Saving ⭐' : 'Save for this'}
          </button>
        </div>
      )}
    </div>
  )
}

function RedemptionRow({
  redemption,
  onOpen,
  onMarkDelivered,
}: {
  redemption: RedemptionRecord
  onOpen: () => void
  onMarkDelivered: () => void
}) {
  return (
    <li className="card flex items-center gap-2 p-3">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <span className="block truncate font-semibold">{redemption.title}</span>
        <span className="block text-sm text-ink-muted">
          {redemption.cost} 🥕, {formatDate(redemption.redeemedAt)}
        </span>
      </button>
      {redemption.deliveredAt ? (
        <span className="text-sm font-semibold text-primary-ink">Delivered</span>
      ) : (
        <button type="button" className="btn-secondary min-h-11 px-3" onClick={onMarkDelivered}>
          Mark delivered
        </button>
      )}
    </li>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
