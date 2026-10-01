import { describe, expect, it } from 'vitest'
import { shouldOfferPlanWeek } from './planWeek'
import { EMPTY_SCHEDULE } from './weeklySchedule'

describe('shouldOfferPlanWeek', () => {
  it('waits for the first finished workout (the Welcome card owns the first open)', () => {
    expect(shouldOfferPlanWeek(false, null)).toBe(false)
    expect(shouldOfferPlanWeek(false, EMPTY_SCHEDULE)).toBe(false)
  })

  it('offers planning after a workout while no day is planned', () => {
    expect(shouldOfferPlanWeek(true, null)).toBe(true)
    expect(shouldOfferPlanWeek(true, EMPTY_SCHEDULE)).toBe(true)
  })

  it('goes away once any day is planned, rest days included', () => {
    expect(shouldOfferPlanWeek(true, { ...EMPTY_SCHEDULE, 2: 'rest' })).toBe(false)
    expect(shouldOfferPlanWeek(true, { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a' })).toBe(false)
  })
})
