import { useRef, useState } from 'react'
import { useSheetFocus } from './useSheetFocus'
import { GIFT_LINK_VERSION, buildGiftLinkUrl, deliveredShareMessage, extractCouponCodes, type DeliveredPayload } from '../../domain/rewards/giftLink'
import { shareLink, type ShareLinkOutcome } from './shareLink'

// Hubby Bunny's "Mark delivered" composer, PIN-gated by the caller, same
// gate as GiftComposerSheet: he's on HIS phone with no access to her
// redemptions at all, only whatever coupon code(s) she sent him (texted,
// shown in person, however) -- pasting that in and sending back a
// `kind: 'delivered'` link is the only round trip that works without her
// device. The in-app PIN "mark delivered" path (RewardsScreen, her phone)
// keeps working exactly as before; this is an additional path, not a
// replacement.

export function DeliveredComposerSheet({ giverName, onClose }: { giverName: string; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)

  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; message: { title: string; text: string } } | null>(null)
  const [shareOutcome, setShareOutcome] = useState<ShareLinkOutcome | 'idle'>('idle')

  const codes = extractCouponCodes(text)

  function handleBuildLink() {
    if (codes.length === 0) {
      setError('Paste the coupon code (or the whole message) first.')
      return
    }
    setError(null)
    const payload: DeliveredPayload = { v: GIFT_LINK_VERSION, kind: 'delivered', redemptionIds: codes, from: giverName, createdAt: new Date().toISOString() }
    const url = buildGiftLinkUrl(payload, { origin: window.location.origin, baseUrl: import.meta.env.BASE_URL })
    setResult({ url, message: deliveredShareMessage(payload) })
    setShareOutcome('idle')
  }

  async function handleShare() {
    if (!result) return
    setShareOutcome(await shareLink({ ...result.message, url: result.url }))
  }

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mark a coupon delivered"
      >
        <p className="text-lg font-bold">Mark delivered</p>
        <p className="text-sm text-ink-muted">Paste the coupon code, or the whole message you got.</p>

        {!result && (
          <>
            <label className="block space-y-1 text-left">
              <span className="text-sm font-semibold">Coupon code or message</span>
              <textarea
                className="input min-h-20"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Coupon code or message"
                autoFocus
              />
            </label>
            {codes.length > 0 && (
              <p className="text-sm text-ink-muted">
                Found {codes.length === 1 ? 'code' : 'codes'}: {codes.map((c) => `FS-${c}`).join(', ')}
              </p>
            )}
            {error && (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn-primary btn-lg w-full" onClick={handleBuildLink}>
              Make delivered link
            </button>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="card space-y-2 p-4 text-center">
              <p aria-hidden="true" className="text-4xl">
                ✅
              </p>
              <p className="font-semibold">{result.message.text}</p>
              <p className="break-all rounded-control bg-field-notice p-2 text-xs" data-testid="delivered-link-url">
                {result.url}
              </p>
            </div>
            {shareOutcome === 'copied' && <p className="text-sm text-primary-ink" role="status">Link copied!</p>}
            {shareOutcome === 'failed' && <p className="text-sm text-accent" role="alert">Couldn't share. Copy the link above instead.</p>}
            <button type="button" className="btn-primary btn-lg w-full" onClick={() => void handleShare()}>
              Share delivered link
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setResult(null)}>
              Back
            </button>
          </div>
        )}

        <button type="button" className="btn-ghost w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
