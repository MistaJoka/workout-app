import { useState } from 'react'
import type { RedemptionRecord } from '../../infrastructure/db/schema'
import { markThanked } from '../../infrastructure/db/repositories/redemptionsRepository'
import { GIFT_LINK_VERSION, THANKS_MESSAGES, buildGiftLinkUrl, thanksShareMessage } from '../../domain/rewards/giftLink'
import { shareLink, type ShareLinkOutcome } from './shareLink'
import { linkLocation, senderName, Sheet, ShareStatus } from './WishSheets'

// After a coupon is delivered: one tap sends the giver a thank-you card
// (a link that opens a card on their phone). Gratitude, not a chore: it's
// offered, never asked for, and nothing happens if she skips it.
export function ThanksSheet({
  redemption,
  emoji,
  giverName,
  onThanked,
  onClose,
}: {
  redemption: RedemptionRecord
  emoji: string
  giverName: string
  onThanked: () => void
  onClose: () => void
}) {
  const [message, setMessage] = useState<string>(THANKS_MESSAGES[0])
  const [outcome, setOutcome] = useState<ShareLinkOutcome | 'idle'>('idle')

  async function send() {
    const payload = {
      v: GIFT_LINK_VERSION,
      kind: 'thanks' as const,
      from: senderName(),
      title: redemption.title,
      emoji,
      message,
      createdAt: new Date().toISOString(),
    }
    const result = await shareLink({ ...thanksShareMessage(payload), url: buildGiftLinkUrl(payload, linkLocation()) })
    setOutcome(result)
    if (result !== 'failed') {
      await markThanked(redemption.id).catch(() => {})
      onThanked()
    }
  }

  return (
    <Sheet label={`Say thanks for ${redemption.title}`} onClose={onClose}>
      <div className="card space-y-1 p-4 text-center">
        <p aria-hidden="true" className="text-4xl">
          {emoji}
        </p>
        <p className="font-bold">{redemption.title}</p>
        <p className="text-sm text-ink-muted">Say thanks to {giverName}</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Thank-you message">
        {THANKS_MESSAGES.map((m) => (
          <button
            key={m}
            type="button"
            className={`${message === m ? 'btn-primary' : 'btn-secondary'} min-h-11 px-2 text-sm`}
            aria-pressed={message === m}
            onClick={() => setMessage(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <ShareStatus outcome={outcome} />
      <button type="button" className="btn-primary btn-lg w-full" onClick={() => void send()}>
        Send to {giverName} 💌
      </button>
      <button type="button" className="btn-ghost w-full" onClick={onClose}>
        {outcome === 'shared' || outcome === 'copied' ? 'Done' : 'Not now'}
      </button>
    </Sheet>
  )
}
