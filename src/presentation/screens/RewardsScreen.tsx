import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import type { RedemptionRecord, RewardRecord } from '../../infrastructure/db/schema'
import { listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { addReward, updateReward, removeReward } from '../../infrastructure/db/repositories/rewardsRepository'
import { listRedemptions, markDelivered, redeemReward } from '../../infrastructure/db/repositories/redemptionsRepository'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { DEFAULT_GIVER_NAME, createPinRecord, isValidPin, verifyPin, type PinRecord } from '../../domain/rewards/pin'
import { generateSalt, hasSubtleCrypto, sha256Hex } from '../../infrastructure/pinCrypto'
import { loadCarrotBalance } from '../components/CarrotCelebration'
import { PinEntrySheet, PinSetupSheet, RedeemConfirmSheet, CouponSheet } from '../components/RewardsSheets'
import { RewardEditorSheet, type RewardDraft } from '../components/RewardEditorSheet'
import { GiftComposerSheet } from '../components/GiftComposerSheet'
import { DeliveredComposerSheet } from '../components/DeliveredComposerSheet'
import { renderCardToBlob, ShareIcon } from '../components/ShareCardButton'
import { shareOrDownload } from '../components/shareOrDownload'
import { buildCouponCardModel, couponCardFilename, drawCouponCard } from '../rewardsCard'
import { couponShareMessage, shortRedemptionCode } from '../../domain/rewards/giftLink'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { Skeleton, SkeletonTiles } from '../components/Skeleton'

const GIVER_NAME_KEY = 'rewardsGiverName'
const PIN_KEY = 'rewardsHubbyPin'

type PinPurpose = 'manage' | 'giftCompose' | 'deliverCompose' | { deliver: string }

type Sheet =
  | { kind: 'none' }
  | { kind: 'pinSetup'; purpose: PinPurpose }
  | { kind: 'pinEntry'; purpose: PinPurpose }
  | { kind: 'editor' }
  | { kind: 'giftCompose' }
  | { kind: 'deliverCompose' }
  | { kind: 'redeemConfirm'; reward: RewardRecord }
  | { kind: 'coupon'; redemption: RedemptionRecord; emoji: string }

type Data = { rewards: RewardRecord[]; redemptions: RedemptionRecord[]; balance: number; giverName: string; pin: PinRecord | null }

async function load(): Promise<Data> {
  const [rewards, redemptions, balance, giverName, pin] = await Promise.all([
    listRewards(),
    listRedemptions(),
    loadCarrotBalance(),
    getSetting<string>(GIVER_NAME_KEY),
    getSetting<PinRecord>(PIN_KEY),
  ])
  return { rewards, redemptions, balance, giverName: giverName ?? DEFAULT_GIVER_NAME, pin: pin ?? null }
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
  const [feedback] = useFeedbackSettings()

  useEffect(() => {
    let cancelled = false
    load()
      .then((loaded) => {
        if (cancelled) return
        setData(loaded)
        // Settings -> "Hubby's reward shop" hands off here to start setup
        // right away, instead of landing on the plain shop view first.
        if ((location.state as { openManage?: boolean } | null)?.openManage) {
          setSheet(loaded.pin ? { kind: 'pinEntry', purpose: 'manage' } : { kind: 'pinSetup', purpose: 'manage' })
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
    setSheet(data?.pin ? { kind: 'pinEntry', purpose } : { kind: 'pinSetup', purpose })
  }

  function openManage() {
    requestPinFor('manage')
  }

  function landOnPurpose(purpose: PinPurpose): Sheet {
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
      await refresh()
      if (typeof purpose === 'object') {
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
    setPinBusy(true)
    setPinError(null)
    try {
      const ok = await verifyPin(pin, data.pin, sha256Hex)
      if (!ok) {
        setPinError('Wrong PIN.')
        return
      }
      if (typeof purpose === 'object') {
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

  function requestMarkDelivered(redemptionId: string) {
    requestPinFor({ deliver: redemptionId })
  }

  async function handleAdd(draft: RewardDraft) {
    setEditorError(null)
    try {
      await addReward(draft)
      await refresh()
    } catch {
      setEditorError("Couldn't save on this device. Try again.")
    }
  }

  async function handleUpdate(id: string, patch: Partial<Pick<RewardRecord, 'title' | 'cost' | 'emoji' | 'active'>>) {
    setEditorError(null)
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
