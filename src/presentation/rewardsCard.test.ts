import { describe, expect, it } from 'vitest'
import { buildCouponCardModel, couponCardFilename } from './rewardsCard'

const base = {
  title: 'Foot rub',
  emoji: '🦶',
  cost: 30,
  redeemedAt: '2026-10-01T18:30:00.000Z',
  giverName: 'Hubby Bunny',
}

describe('buildCouponCardModel', () => {
  it('carries the reward, its cost, and the giver', () => {
    const model = buildCouponCardModel(base)
    expect(model.header).toBe('Redeemed!')
    expect(model.title).toBe('Foot rub')
    expect(model.emoji).toBe('🦶')
    expect(model.costLabel).toBe('30 🥕')
    expect(model.giverLine).toBe('Redeemable with Hubby Bunny')
  })

  it('uses the first name when one is set', () => {
    expect(buildCouponCardModel({ ...base, name: 'Kay' }).header).toBe("Kay's coupon")
  })

  it('respects a customized giver name', () => {
    expect(buildCouponCardModel({ ...base, giverName: 'Alex' }).giverLine).toBe('Redeemable with Alex')
  })

  it('never uses a middle dot (copy rule)', () => {
    expect(JSON.stringify(buildCouponCardModel({ ...base, name: 'Kay' }))).not.toContain('·')
  })
})

describe('couponCardFilename', () => {
  it('names the file by the redeemed day', () => {
    expect(couponCardFilename('2026-10-01T18:30:00.000Z')).toBe('coupon-2026-10-01.png')
  })
})

describe('coupon card art', () => {
  const input = { title: 'Pizza night', emoji: '🍕', cost: 40, redeemedAt: '2026-10-05T12:00:00.000Z', giverName: 'Hubby Bunny' }
  it("uses the reward's pixel tile when it has an icon", () => {
    const art = buildCouponCardModel({ ...input, icon: 'pizza' }).art
    expect(art.kind).toBe('image')
    expect(art.kind === 'image' && art.src).toMatch(/rewards\/pizza-tile\.webp$/)
  })
  it('uses the emoji without an icon, or with one this app does not know', () => {
    expect(buildCouponCardModel(input).art).toEqual({ kind: 'emoji', text: '🍕' })
    expect(buildCouponCardModel({ ...input, icon: 'not-a-real-icon' }).art).toEqual({ kind: 'emoji', text: '🍕' })
  })
})
