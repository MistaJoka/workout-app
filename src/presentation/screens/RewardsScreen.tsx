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
import { renderCardToBlob, ShareIcon } from '../components/ShareCardButton'
import { shareOrDownload } from '../components/shareOrDownload'
import { buildCouponCardModel, couponCardFilename, drawCouponCard } from '../rewardsCard'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { Skeleton, SkeletonTiles } from '../components/Skeleton'
import { HubbyModePill, isHubbyUnlocked, touchHubbySession, unlockHubbySession, useHubbySession } from '../components/hubbySession'

const GIVER_NAME_KEY = 'rewardsGiverName'
const PIN_KEY = 'rewardsHubbyPin'
const PIN_ATTEMPTS_KEY = 'rewardsHubbyPinAttempts'

type Sheet =
  | { kind: 'none' }
  | { kind: 'pinSetup' }
  | { kind: 'pinEntry'; purpose: 'manage' | { deliver: string } }
  | { kind: 'editor' }
  | { kind: 'redeemConfirm'; reward: RewardRecord }
  | { kind: 'coupon'; redemption: RedemptionRecord; emoji: string }

type Data = {
  rewards: RewardRecord[]
  redemptions: RedemptionRecord[]
  balance: number
  giverName: string
  pin: PinRecord | null
  pinAttempts: PinAttemptState
}

async function load(): Promise<Data> {
  const [rewards, redemptions, balance, giverName, pin, pinAttempts] = await Promise.all([
    listRewards(),
    listRedemptions(),
    loadCarrotBalance(),
    getSetting<string>(GIVER_NAME_KEY),
    getSetting<PinRecord>(PIN_KEY),
    getSetting<PinAttemptState>(PIN_ATTEMPTS_KEY),
  ])
  return {
    rewards,
    redemptions,
    balance,
    giverName: giverName ?? DEFAULT_GIVER_NAME,
    pin: pin ?? null,
    pinAttempts: pinAttempts ?? INITIAL_PIN_ATTEMPT_STATE,
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
        if ((location.state as { openManage?: boolean } | null)?.openManage) {
          setSheet(
            !loaded.pin ? { kind: 'pinSetup' } : isHubbyUnlocked() ? { kind: 'editor' } : { kind: 'pinEntry', purpose: 'manage' }
          )
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

  function openManage() {
    setPinError(null)
    if (!data?.pin) {
      setSheet({ kind: 'pinSetup' })
    } else if (isHubbyUnlocked()) {
      setSheet({ kind: 'editor' })
    } else {
      setSheet({ kind: 'pinEntry', purpose: 'manage' })
    }
  }

  async function handleSetPin(pin: string, giverName: string) {
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
      setSheet({ kind: 'editor' })
    } catch {
      setPinError("Couldn't save on this device. Try again.")
    } finally {
      setPinBusy(false)
    }
  }

  async function handlePinSubmit(pin: string, purpose: 'manage' | { deliver: string }) {
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
      if (purpose === 'manage') {
        setSheet({ kind: 'editor' })
      } else {
        await markDelivered(purpose.deliver)
        await refresh()
        setSheet({ kind: 'none' })
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
    setPinError(null)
    if (isHubbyUnlocked()) {
      void performMarkDelivered(redemptionId)
      return
    }
    setSheet({ kind: 'pinEntry', purpose: { deliver: redemptionId } })
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

  async function handleRedeem(reward: RewardRecord) {
    setRedeemBusy(true)
    setRedeemError(null)
    try {
      const redemption = await redeemReward(reward)
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
      await shareOrDownload(blob, couponCardFilename(redemption.redeemedAt), 'image/png')
    } catch {
      setShareError("Couldn't make the coupon on this device. Try again.")
    } finally {
      setShareBusy(false)
    }
  }

  function openCoupon(redemption: RedemptionRecord) {
    const reward = data?.rewards.find((r) => r.id === redemption.rewardId)
    setShareError(null)
    setSheet({ kind: 'coupon', redemption, emoji: reward?.emoji ?? '🥕' })
  }

  const activeRewards = data?.rewards.filter((r) => r.active) ?? []
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

          {activeRewards.length === 0 ? (
            <RaeNote expression="smile">
              {data.giverName} hasn't added anything to the shop yet. Tap "{data.pin ? 'Manage shop' : 'Set up shop'}" to add
              the first reward.
            </RaeNote>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeRewards.map((reward) => (
                <RewardTile key={reward.id} reward={reward} balance={data.balance} onRedeem={() => setSheet({ kind: 'redeemConfirm', reward })} />
              ))}
            </div>
          )}

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
        </>
      )}

      {sheet.kind === 'pinSetup' && (
        <PinSetupSheet
          giverNameInitial={data?.giverName ?? DEFAULT_GIVER_NAME}
          busy={pinBusy}
          error={pinError}
          onSave={handleSetPin}
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

      {sheet.kind === 'redeemConfirm' && (
        <RedeemConfirmSheet
          title={sheet.reward.title}
          emoji={sheet.reward.emoji}
          cost={sheet.reward.cost}
          busy={redeemBusy}
          error={redeemError}
          onConfirm={() => void handleRedeem(sheet.reward)}
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

function RewardTile({ reward, balance, onRedeem }: { reward: RewardRecord; balance: number; onRedeem: () => void }) {
  const affordable = balance >= reward.cost
  const pct = reward.cost > 0 ? Math.min(100, Math.round((balance / reward.cost) * 100)) : 100
  return (
    <div className="card space-y-2 p-3 text-center">
      <span aria-hidden="true" className="text-3xl">
        {reward.emoji}
      </span>
      <p className="font-bold leading-tight">{reward.title}</p>
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
