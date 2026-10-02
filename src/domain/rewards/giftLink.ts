import { z } from 'zod'

// Gift links: Hubby Bunny sends rewards/love notes (or a "delivered"
// receipt) to his wife's phone without ever touching it. All of the data
// travels inside the URL itself (base64url JSON in the hash's `d` query
// param) -- there is no server, so a link is the whole message. Pure,
// framework-independent codec/decision logic only; infrastructure/db
// repositories own actually writing an accepted gift into IndexedDB, and
// the presentation layer owns building the URL from the app's own
// origin/base path (asset.ts's job for ordinary assets; this module never
// imports `import.meta`, same reason carrots.ts/loveNotes.ts stay pure).

export const GIFT_LINK_VERSION = 1 as const

// Encoded-string size guard, not raw JSON size: this is what actually ends
// up in the URL (and in a share-sheet message), and is what a malformed or
// hostile string could blow up decoding before it's even parsed. ~16KB is
// comfortably past any real gift (a few dozen rewards/notes) and comfortably
// under every platform's practical URL-length ceiling.
export const MAX_ENCODED_LENGTH = 16 * 1024

const giftRewardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cost: z.number().nonnegative(),
  emoji: z.string().min(1),
})

const giftNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  emoji: z.string().min(1),
})

const giftPayloadSchema = z.object({
  v: z.literal(GIFT_LINK_VERSION),
  kind: z.literal('gift'),
  from: z.string().min(1),
  rewards: z.array(giftRewardSchema),
  notes: z.array(giftNoteSchema),
  createdAt: z.string().min(1),
})

const deliveredPayloadSchema = z.object({
  v: z.literal(GIFT_LINK_VERSION),
  kind: z.literal('delivered'),
  // Short coupon codes (shortRedemptionCode below), not full redemption
  // ids: the sender (Hubby Bunny, on his own device/profile) never has
  // access to her redemption ids at all -- only whatever code her coupon's
  // share message showed him.
  redemptionIds: z.array(z.string().min(1)),
  from: z.string().min(1),
  createdAt: z.string().min(1),
})

const giftLinkPayloadSchema = z.discriminatedUnion('kind', [giftPayloadSchema, deliveredPayloadSchema])

export type GiftReward = z.infer<typeof giftRewardSchema>
export type GiftNote = z.infer<typeof giftNoteSchema>
export type GiftPayload = z.infer<typeof giftPayloadSchema>
export type DeliveredPayload = z.infer<typeof deliveredPayloadSchema>
export type GiftLinkPayload = GiftPayload | DeliveredPayload

// ---- base64url, byte-for-byte (no btoa/atob: this module stays pure and
// environment-agnostic, running the same in the browser and under vitest). ----

const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0)
    out += BASE64URL_CHARS[(triple >> 18) & 0x3f]
    out += BASE64URL_CHARS[(triple >> 12) & 0x3f]
    out += b1 !== undefined ? BASE64URL_CHARS[(triple >> 6) & 0x3f] : ''
    out += b2 !== undefined ? BASE64URL_CHARS[triple & 0x3f] : ''
  }
  return out
}

function base64UrlToBytes(input: string): Uint8Array {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of input) {
    const idx = BASE64URL_CHARS.indexOf(ch)
    if (idx === -1) continue // skip anything that isn't ours (whitespace, a stray '=' , ...)
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

// ---- encode/decode ----

export class GiftLinkTooLargeError extends Error {
  constructor() {
    super('Gift link payload is too large to encode')
  }
}

// Compact JSON -> UTF-8 -> base64url. Throws GiftLinkTooLargeError rather
// than silently truncating -- a composer screen should never hand someone a
// link that can't round-trip.
export function encodeGiftPayload(payload: GiftLinkPayload): string {
  const json = JSON.stringify(payload)
  const encoded = bytesToBase64Url(new TextEncoder().encode(json))
  if (encoded.length > MAX_ENCODED_LENGTH) throw new GiftLinkTooLargeError()
  return encoded
}

export type DecodeGiftLinkResult =
  | { ok: true; payload: GiftLinkPayload }
  | { ok: false; error: 'empty' | 'tooLarge' | 'malformed' }

// The reverse, defensive at every step: an empty/oversized/undecodable/
// unparseable/schema-invalid string is always `{ ok: false }`, never a
// thrown exception -- a damaged or hand-edited link is just a bad link, the
// same posture bundleSchema.ts takes for a damaged backup file.
export function decodeGiftLinkPayload(encoded: string): DecodeGiftLinkResult {
  if (!encoded) return { ok: false, error: 'empty' }
  if (encoded.length > MAX_ENCODED_LENGTH) return { ok: false, error: 'tooLarge' }
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded))
    const parsed = JSON.parse(json)
    const result = giftLinkPayloadSchema.safeParse(parsed)
    if (!result.success) return { ok: false, error: 'malformed' }
    return { ok: true, payload: result.data }
  } catch {
    return { ok: false, error: 'malformed' }
  }
}

// `<origin><base>#/gift?d=<encoded>`, built from the app's own
// origin/BASE_URL (never hardcoded) so the same link works whether the
// sender is a local build, the Capacitor app, or the GitHub Pages project
// site -- base-path-safe the same way asset() is.
export function buildGiftLinkUrl(payload: GiftLinkPayload, location: { origin: string; baseUrl: string }): string {
  const encoded = encodeGiftPayload(payload)
  const base = location.baseUrl.endsWith('/') ? location.baseUrl : `${location.baseUrl}/`
  return `${location.origin}${base}#/gift?d=${encoded}`
}

// Her app may be the installed APK while his link is a web address, so the
// shop lets her paste the link (or the whole shared message) instead of
// tapping it. Returns the `d` payload, or null when there's no gift link.
export function extractGiftLinkData(text: string): string | null {
  const match = /#\/gift\?(?:[^\s#]*&)?d=([A-Za-z0-9_-]+)/.exec(text)
  return match ? match[1] : null
}

// ---- idempotency: "already added"/"already delivered" ----

// True once every reward and note id in the payload is already present
// locally -- re-opening (or re-accepting) the same gift link a second time
// never duplicates anything, and the preview screen can say "Already added"
// instead of offering Accept again. Trivially true for an (unusual) empty
// gift, since there is nothing left to add.
export function giftAlreadyAccepted(
  payload: GiftPayload,
  existingRewardIds: ReadonlySet<string>,
  existingNoteIds: ReadonlySet<string>
): boolean {
  return payload.rewards.every((r) => existingRewardIds.has(r.id)) && payload.notes.every((n) => existingNoteIds.has(n.id))
}

export type MatchableRedemption = { id: string; deliveredAt: string | null }

// Every local redemption whose own short code (shortRedemptionCode) is one
// of `codes` -- order follows `redemptions`, not `codes`, and duplicates in
// `codes` never produce duplicate matches.
export function matchRedemptionsByCode<T extends MatchableRedemption>(
  redemptions: readonly T[],
  codes: readonly string[]
): T[] {
  const wanted = new Set(codes.map((c) => c.toUpperCase()))
  return redemptions.filter((r) => wanted.has(shortRedemptionCode(r.id)))
}

// True once every matched redemption is already delivered. An empty match
// list (no local redemption has a matching code) is deliberately NOT
// "already applied" -- that's a distinct "nothing found" state the caller
// should surface separately.
export function deliveredAlreadyApplied(matches: readonly MatchableRedemption[]): boolean {
  return matches.length > 0 && matches.every((m) => m.deliveredAt !== null)
}

// ---- coupon short codes (the delivery round trip) ----

// A short, typeable stand-in for a redemption's own id: the first 6 hex
// characters of its UUID, uppercased, no dashes. On a device with only a
// handful of redemptions ever, a 6-character (16.7M-way) code is effectively
// unique; this never needs to be cryptographically unique, only easy to read
// off a coupon and retype or paste into the "Mark delivered" composer.
const CODE_LENGTH = 6

export function shortRedemptionCode(redemptionId: string): string {
  return redemptionId.replace(/-/g, '').toUpperCase().slice(0, CODE_LENGTH)
}

// Pulls coupon codes out of free-form pasted text (the exact message a
// coupon's share sheet produced, or just the code itself): "FS-" followed by
// 6 hex characters, case-insensitive, de-duplicated, in the order they first
// appear.
const CODE_PATTERN = /\bFS-?([0-9A-F]{6})\b/gi

export function extractCouponCodes(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of text.matchAll(CODE_PATTERN)) {
    const code = match[1].toUpperCase()
    if (!seen.has(code)) {
      seen.add(code)
      out.push(code)
    }
  }
  return out
}

// ---- share messages ----

function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

// "Hubby Bunny sent you 3 rewards and 2 love notes 💌" -- the cute message
// handed to the share sheet (or shown in the composer) alongside the link.
export function giftShareMessage(payload: GiftPayload): { title: string; text: string } {
  const parts: string[] = []
  if (payload.rewards.length > 0) parts.push(countLabel(payload.rewards.length, 'reward', 'rewards'))
  if (payload.notes.length > 0) parts.push(countLabel(payload.notes.length, 'love note', 'love notes'))
  const body = parts.length > 0 ? parts.join(' and ') : 'a surprise'
  return { title: `A gift from ${payload.from}`, text: `${payload.from} sent you ${body} 💌` }
}

export function deliveredShareMessage(payload: DeliveredPayload): { title: string; text: string } {
  const label = countLabel(payload.redemptionIds.length, 'coupon', 'coupons')
  return { title: `${payload.from} marked it delivered`, text: `${payload.from} delivered ${label} ✓` }
}

// The coupon's own share message (her phone, redeeming): what tells Hubby
// Bunny which coupon this is, in plain text, short enough for any share
// target. `code` is shortRedemptionCode(redemption.id).
export function couponShareMessage(input: { title: string; emoji: string; giverName: string; code: string }): {
  title: string
  text: string
} {
  return {
    title: `${input.emoji} ${input.title}`,
    text: `I redeemed ${input.emoji} ${input.title}! Show ${input.giverName} this when it's delivered -- coupon code FS-${input.code}.`,
  }
}
