import { describe, expect, it } from 'vitest'
import {
  extractGiftLinkData,
  wishShareMessage,
  GIFT_LINK_VERSION,
  GiftLinkTooLargeError,
  MAX_ENCODED_LENGTH,
  buildGiftLinkUrl,
  couponShareMessage,
  decodeGiftLinkPayload,
  deliveredAlreadyApplied,
  deliveredShareMessage,
  encodeGiftPayload,
  extractCouponCodes,
  giftAlreadyAccepted,
  giftShareMessage,
  matchRedemptionsByCode,
  shortRedemptionCode,
  type DeliveredPayload,
  type GiftPayload,
} from './giftLink'

const gift: GiftPayload = {
  v: GIFT_LINK_VERSION,
  kind: 'gift',
  from: 'Hubby Bunny',
  rewards: [{ id: 'r1', title: 'Breakfast in bed', cost: 25, emoji: '🍳' }],
  notes: [
    { id: 'n1', text: 'Proud of you', emoji: '💌' },
    { id: 'n2', text: 'You are amazing', emoji: '💖' },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
}

describe('encodeGiftPayload / decodeGiftLinkPayload', () => {
  it('round-trips a gift payload exactly', () => {
    const encoded = encodeGiftPayload(gift)
    const decoded = decodeGiftLinkPayload(encoded)
    expect(decoded).toEqual({ ok: true, payload: gift })
  })

  it('round-trips unicode (emoji, accented text) correctly', () => {
    const withUnicode: GiftPayload = { ...gift, from: 'Héllo 🐰', notes: [{ id: 'n1', text: 'Café ☕ love you 💕', emoji: '🥰' }] }
    const decoded = decodeGiftLinkPayload(encodeGiftPayload(withUnicode))
    expect(decoded).toEqual({ ok: true, payload: withUnicode })
  })

  it('encodes as a base64url string (no +, / or = characters)', () => {
    const encoded = encodeGiftPayload(gift)
    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('rejects an empty string', () => {
    expect(decodeGiftLinkPayload('')).toEqual({ ok: false, error: 'empty' })
  })

  it('rejects an oversized string without trying to parse it', () => {
    const huge = 'A'.repeat(MAX_ENCODED_LENGTH + 1)
    expect(decodeGiftLinkPayload(huge)).toEqual({ ok: false, error: 'tooLarge' })
  })

  it('throws GiftLinkTooLargeError when encoding a payload that would exceed the guard', () => {
    const huge: GiftPayload = { ...gift, notes: [{ id: 'n1', text: 'x'.repeat(MAX_ENCODED_LENGTH * 2), emoji: '💌' }] }
    expect(() => encodeGiftPayload(huge)).toThrow(GiftLinkTooLargeError)
  })

  it('rejects garbage base64url that decodes to invalid JSON', () => {
    expect(decodeGiftLinkPayload('bm90LXZhbGlkLWpzb24')).toEqual({ ok: false, error: 'malformed' })
  })

  it('rejects valid JSON that fails the schema (missing fields)', () => {
    const encoded = encodeGiftPayload({ v: 1, kind: 'gift' } as unknown as GiftPayload)
    expect(decodeGiftLinkPayload(encoded)).toEqual({ ok: false, error: 'malformed' })
  })

  it('rejects an unknown version or kind', () => {
    const badVersion = encodeGiftPayload({ ...gift, v: 2 } as unknown as GiftPayload)
    expect(decodeGiftLinkPayload(badVersion)).toMatchObject({ ok: false, error: 'malformed' })
    const badKind = encodeGiftPayload({ ...gift, kind: 'surprise' } as unknown as GiftPayload)
    expect(decodeGiftLinkPayload(badKind)).toMatchObject({ ok: false, error: 'malformed' })
  })

  it('round-trips a delivered payload', () => {
    const delivered: DeliveredPayload = { v: 1, kind: 'delivered', redemptionIds: ['AB12CD'], from: 'Hubby Bunny', createdAt: gift.createdAt }
    expect(decodeGiftLinkPayload(encodeGiftPayload(delivered))).toEqual({ ok: true, payload: delivered })
  })

  it('an empty gift (no rewards, no notes) still encodes and decodes', () => {
    const empty: GiftPayload = { ...gift, rewards: [], notes: [] }
    expect(decodeGiftLinkPayload(encodeGiftPayload(empty))).toEqual({ ok: true, payload: empty })
  })
})

describe('buildGiftLinkUrl', () => {
  it('builds a hash route URL under the app origin and base path', () => {
    const url = buildGiftLinkUrl(gift, { origin: 'https://example.com', baseUrl: '/' })
    expect(url).toMatch(/^https:\/\/example\.com\/#\/gift\?d=[A-Za-z0-9\-_]+$/)
  })

  it('honors a non-root base path (GitHub Pages project site) exactly once', () => {
    const url = buildGiftLinkUrl(gift, { origin: 'https://example.com', baseUrl: '/workout-app/' })
    expect(url).toMatch(/^https:\/\/example\.com\/workout-app\/#\/gift\?d=/)
  })

  it('normalizes a base path missing its trailing slash', () => {
    const url = buildGiftLinkUrl(gift, { origin: 'https://example.com', baseUrl: '/workout-app' })
    expect(url).toMatch(/^https:\/\/example\.com\/workout-app\/#\/gift\?d=/)
  })

  it('the URL decodes back to the same payload', () => {
    const url = buildGiftLinkUrl(gift, { origin: 'https://example.com', baseUrl: '/' })
    const encoded = new URL(url).hash.split('d=')[1]
    expect(decodeGiftLinkPayload(encoded)).toEqual({ ok: true, payload: gift })
  })
})

describe('giftAlreadyAccepted', () => {
  it('false when any reward or note id is missing locally', () => {
    expect(giftAlreadyAccepted(gift, new Set(), new Set())).toBe(false)
    expect(giftAlreadyAccepted(gift, new Set(['r1']), new Set())).toBe(false)
  })

  it('true once every id already exists locally', () => {
    expect(giftAlreadyAccepted(gift, new Set(['r1']), new Set(['n1', 'n2']))).toBe(true)
  })

  it('true for an empty gift regardless of local state', () => {
    expect(giftAlreadyAccepted({ ...gift, rewards: [], notes: [] }, new Set(), new Set())).toBe(true)
  })
})

describe('shortRedemptionCode / matchRedemptionsByCode / extractCouponCodes', () => {
  it('derives a 6-character uppercase code with no dashes', () => {
    expect(shortRedemptionCode('ab12cd34-5678-90ab-cdef-000000000000')).toBe('AB12CD')
  })

  it('matchRedemptionsByCode finds redemptions whose own code matches, case-insensitively', () => {
    const redemptions = [
      { id: 'ab12cd34-0000', deliveredAt: null },
      { id: 'ff00ff00-0000', deliveredAt: null },
    ]
    expect(matchRedemptionsByCode(redemptions, ['ab12cd'])).toEqual([redemptions[0]])
    expect(matchRedemptionsByCode(redemptions, ['AB12CD'])).toEqual([redemptions[0]])
    expect(matchRedemptionsByCode(redemptions, ['nope00'])).toEqual([])
  })

  it('matchRedemptionsByCode never duplicates a redemption for a repeated code', () => {
    const redemptions = [{ id: 'ab12cd34-0000', deliveredAt: null }]
    expect(matchRedemptionsByCode(redemptions, ['AB12CD', 'ab12cd'])).toEqual(redemptions)
  })

  it('extractCouponCodes pulls codes out of a full share message', () => {
    const text = "I redeemed 🍳 Breakfast in bed! Show Hubby Bunny this when it's delivered -- coupon code FS-AB12CD."
    expect(extractCouponCodes(text)).toEqual(['AB12CD'])
  })

  it('extractCouponCodes accepts a bare code, case-insensitively, with or without a dash', () => {
    expect(extractCouponCodes('fsab12cd')).toEqual(['AB12CD'])
    expect(extractCouponCodes('FS-ab12cd')).toEqual(['AB12CD'])
  })

  it('extractCouponCodes de-duplicates and preserves first-seen order across several messages', () => {
    expect(extractCouponCodes('FS-AB12CD and also FS-000000, then FS-ab12cd again')).toEqual(['AB12CD', '000000'])
  })

  it('extractCouponCodes returns nothing for text with no code', () => {
    expect(extractCouponCodes('no codes here')).toEqual([])
  })
})

describe('deliveredAlreadyApplied', () => {
  it('false when nothing matched at all', () => {
    expect(deliveredAlreadyApplied([])).toBe(false)
  })

  it('false when at least one match is still pending delivery', () => {
    expect(deliveredAlreadyApplied([{ id: 'a', deliveredAt: '2026-10-01T00:00:00.000Z' }, { id: 'b', deliveredAt: null }])).toBe(false)
  })

  it('true once every match is already delivered', () => {
    expect(deliveredAlreadyApplied([{ id: 'a', deliveredAt: '2026-10-01T00:00:00.000Z' }])).toBe(true)
  })
})

describe('share messages', () => {
  it('giftShareMessage names both rewards and notes when both are present', () => {
    expect(giftShareMessage(gift)).toEqual({
      title: 'A gift from Hubby Bunny',
      text: 'Hubby Bunny sent you 1 reward and 2 love notes 💌',
    })
  })

  it('giftShareMessage says "a surprise" for an empty gift', () => {
    expect(giftShareMessage({ ...gift, rewards: [], notes: [] }).text).toBe('Hubby Bunny sent you a surprise 💌')
  })

  it('giftShareMessage omits a kind with zero items', () => {
    expect(giftShareMessage({ ...gift, notes: [] }).text).toBe('Hubby Bunny sent you 1 reward 💌')
  })

  it('deliveredShareMessage pluralizes by count', () => {
    expect(deliveredShareMessage({ v: 1, kind: 'delivered', redemptionIds: ['A'], from: 'Hubby Bunny', createdAt: gift.createdAt }).text).toBe(
      'Hubby Bunny delivered 1 coupon ✓'
    )
    expect(
      deliveredShareMessage({ v: 1, kind: 'delivered', redemptionIds: ['A', 'B'], from: 'Hubby Bunny', createdAt: gift.createdAt }).text
    ).toBe('Hubby Bunny delivered 2 coupons ✓')
  })

  it('couponShareMessage includes the emoji, title, giver and code', () => {
    const message = couponShareMessage({ title: 'Breakfast in bed', emoji: '🍳', giverName: 'Hubby Bunny', code: 'AB12CD' })
    expect(message.text).toContain('Breakfast in bed')
    expect(message.text).toContain('Hubby Bunny')
    expect(message.text).toContain('FS-AB12CD')
  })
})

describe('extractGiftLinkData (pasting a link into the app)', () => {
  it('pulls the payload out of a bare link', () => {
    expect(extractGiftLinkData('https://example.ts.net:8443/#/gift?d=eyJ2IjoxfQ')).toBe('eyJ2IjoxfQ')
  })

  it('finds the link inside a whole shared message', () => {
    const text = 'Hubby Bunny sent you 1 reward 💌\nhttps://x/workout-app/#/gift?d=ab-c_D12 '
    expect(extractGiftLinkData(text)).toBe('ab-c_D12')
  })

  it('stops at the next query parameter', () => {
    expect(extractGiftLinkData('https://x/#/gift?d=abc&z=1')).toBe('abc')
  })

  it('returns null for text with no gift link', () => {
    expect(extractGiftLinkData('see you at 6')).toBeNull()
    expect(extractGiftLinkData('https://x/#/gift?d=')).toBeNull()
  })
})

describe('wish links (her wish, sent to him)', () => {
  const wish = {
    v: 1 as const,
    kind: 'wish' as const,
    from: 'Your bunny',
    wishes: [{ id: 'w1', title: 'Spa day', emoji: '🛁' }],
    createdAt: '2026-10-03T10:00:00.000Z',
  }

  it('round-trips through the same codec as gifts', () => {
    expect(decodeGiftLinkPayload(encodeGiftPayload(wish))).toEqual({ ok: true, payload: wish })
  })

  it('rejects a wish with no wishes in it', () => {
    expect(decodeGiftLinkPayload(encodeGiftPayload({ ...wish, wishes: [] })).ok).toBe(false)
  })

  it('has a share message naming the wish', () => {
    expect(wishShareMessage(wish)).toEqual({ title: 'A wish from Your bunny', text: 'Your bunny wishes for: 🛁 Spa day ✨' })
  })
})

