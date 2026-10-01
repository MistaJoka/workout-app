import { describe, expect, it } from 'vitest'
import {
  holidayAccentForDate,
  isSeason,
  resolveHolidayAccent,
  resolveSeason,
  SEASON_OVERRIDE_STORAGE_KEY,
  seasonForDate,
} from './season'

function date(month: number, day: number): Date {
  // month is 1-12 for test readability; Date wants 0-11.
  return new Date(2026, month - 1, day, 12, 0, 0)
}

describe('seasonForDate', () => {
  it('is winter for December, January and February', () => {
    expect(seasonForDate(date(12, 1))).toBe('winter')
    expect(seasonForDate(date(12, 31))).toBe('winter')
    expect(seasonForDate(date(1, 15))).toBe('winter')
    expect(seasonForDate(date(2, 28))).toBe('winter')
  })

  it('is spring for March, April and May', () => {
    expect(seasonForDate(date(3, 1))).toBe('spring')
    expect(seasonForDate(date(4, 15))).toBe('spring')
    expect(seasonForDate(date(5, 31))).toBe('spring')
  })

  it('is summer for June, July and August', () => {
    expect(seasonForDate(date(6, 1))).toBe('summer')
    expect(seasonForDate(date(7, 15))).toBe('summer')
    expect(seasonForDate(date(8, 31))).toBe('summer')
  })

  it('is autumn for September, October and November', () => {
    expect(seasonForDate(date(9, 1))).toBe('autumn')
    expect(seasonForDate(date(10, 15))).toBe('autumn')
    expect(seasonForDate(date(11, 30))).toBe('autumn')
  })
})

describe('holidayAccentForDate', () => {
  it('is a pumpkin only from Oct 20-31', () => {
    expect(holidayAccentForDate(date(10, 19))).toBeNull()
    expect(holidayAccentForDate(date(10, 20))).toBe('pumpkin')
    expect(holidayAccentForDate(date(10, 25))).toBe('pumpkin')
    expect(holidayAccentForDate(date(10, 31))).toBe('pumpkin')
    expect(holidayAccentForDate(date(11, 1))).toBeNull()
  })

  it('is warm lights only from Dec 10-31', () => {
    expect(holidayAccentForDate(date(12, 9))).toBeNull()
    expect(holidayAccentForDate(date(12, 10))).toBe('lights')
    expect(holidayAccentForDate(date(12, 25))).toBe('lights')
    expect(holidayAccentForDate(date(12, 31))).toBe('lights')
  })

  it('is neither outside those windows', () => {
    expect(holidayAccentForDate(date(1, 1))).toBeNull()
    expect(holidayAccentForDate(date(6, 15))).toBeNull()
    expect(holidayAccentForDate(date(9, 1))).toBeNull()
  })
})

describe('isSeason', () => {
  it('accepts the four season strings', () => {
    expect(isSeason('winter')).toBe(true)
    expect(isSeason('spring')).toBe(true)
    expect(isSeason('summer')).toBe(true)
    expect(isSeason('autumn')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isSeason('fall')).toBe(false)
    expect(isSeason('')).toBe(false)
    expect(isSeason(null)).toBe(false)
    expect(isSeason(undefined)).toBe(false)
  })
})

describe('resolveSeason', () => {
  const summer = date(7, 1) // real season would be summer

  it('uses the real season with no override', () => {
    expect(resolveSeason(summer, '')).toBe('summer')
  })

  it('a `?season=` query override wins over the real date', () => {
    expect(resolveSeason(summer, '?season=winter')).toBe('winter')
  })

  it('ignores an invalid query value', () => {
    expect(resolveSeason(summer, '?season=nope')).toBe('summer')
  })

  it('falls back to a dev-only localStorage override', () => {
    const storage = { getItem: (key: string) => (key === SEASON_OVERRIDE_STORAGE_KEY ? 'autumn' : null) }
    expect(resolveSeason(summer, '', storage)).toBe('autumn')
  })

  it('a query override beats the localStorage override', () => {
    const storage = { getItem: () => 'autumn' }
    expect(resolveSeason(summer, '?season=spring', storage)).toBe('spring')
  })

  it('never throws when storage access is blocked', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(resolveSeason(summer, '', storage)).toBe('summer')
  })
})

describe('resolveHolidayAccent', () => {
  const quietDay = date(7, 1) // real accent would be null

  it('uses the real date with no override', () => {
    expect(resolveHolidayAccent(quietDay, '')).toBeNull()
    expect(resolveHolidayAccent(date(10, 25), '')).toBe('pumpkin')
  })

  it('a `?seasonAccent=` query override wins over the real date', () => {
    expect(resolveHolidayAccent(quietDay, '?seasonAccent=pumpkin')).toBe('pumpkin')
    expect(resolveHolidayAccent(quietDay, '?seasonAccent=lights')).toBe('lights')
  })

  it('`?seasonAccent=none` explicitly suppresses a real accent', () => {
    expect(resolveHolidayAccent(date(10, 25), '?seasonAccent=none')).toBeNull()
  })

  it('ignores an invalid query value', () => {
    expect(resolveHolidayAccent(quietDay, '?seasonAccent=nope')).toBeNull()
  })

  it('falls back to a dev-only localStorage override', () => {
    const storage = { getItem: (key: string) => (key.endsWith('accent-override') ? 'lights' : null) }
    expect(resolveHolidayAccent(quietDay, '', storage)).toBe('lights')
  })

  it('never throws when storage access is blocked', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(resolveHolidayAccent(quietDay, '', storage)).toBeNull()
  })
})
