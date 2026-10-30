import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_BACK_DAYS,
  ACTIVITY_KINDS,
  MAX_ACTIVITY_MINUTES,
  activityDate,
  activityDayChoices,
  activityLabel,
  adjustMinutes,
  liveActivities,
  mergeActivity,
  validateActivityInput,
  type ActivityEntry,
} from './activities'

const NOW = new Date(2026, 9, 29, 15, 30) // Thu 29 Oct 2026

function entry(over: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: 'a1',
    kind: 'walk',
    minutes: 30,
    day: '2026-10-29',
    loggedAt: '2026-10-29T15:00:00.000Z',
    updatedAt: '2026-10-29T15:00:00.000Z',
    deletedAt: null,
    ...over,
  }
}

describe('activity kinds', () => {
  it('offers the eight owner kinds, each with an emoji', () => {
    expect(ACTIVITY_KINDS.map((k) => k.id)).toEqual(['walk', 'run', 'bike', 'swim', 'yoga', 'class', 'sport', 'other'])
    for (const kind of ACTIVITY_KINDS) expect(kind.emoji.length).toBeGreaterThan(0)
  })

  it('labels an entry for screen readers', () => {
    expect(activityLabel(entry({ kind: 'yoga', minutes: 45 }))).toBe('Yoga, 45 min')
  })
})

describe('activity days', () => {
  it('offers today and up to 7 days back, newest first', () => {
    const days = activityDayChoices(NOW)
    expect(days).toHaveLength(ACTIVITY_BACK_DAYS + 1)
    expect(days[0]).toBe('2026-10-29')
    expect(days[7]).toBe('2026-10-22')
  })

  it('places an activity at local noon of its day, so it lands in that day and week', () => {
    const at = activityDate('2026-10-26')
    expect(at.getFullYear()).toBe(2026)
    expect(at.getMonth()).toBe(9)
    expect(at.getDate()).toBe(26)
    expect(at.getHours()).toBe(12)
  })
})

describe('minutes', () => {
  it('steps by 5 and stays within 5..MAX', () => {
    expect(adjustMinutes(30, 1)).toBe(35)
    expect(adjustMinutes(5, -1)).toBe(5)
    expect(adjustMinutes(MAX_ACTIVITY_MINUTES, 1)).toBe(MAX_ACTIVITY_MINUTES)
    expect(adjustMinutes(32, 1)).toBe(35)
  })
})

describe('validateActivityInput', () => {
  it('accepts a sane entry', () => {
    expect(validateActivityInput({ kind: 'run', minutes: 20, day: '2026-10-29' }, NOW)).toBeNull()
  })

  it('rejects unknown kinds, bad minutes and days outside the window', () => {
    expect(validateActivityInput({ kind: 'nap' as never, minutes: 20, day: '2026-10-29' }, NOW)).toBe('kind')
    expect(validateActivityInput({ kind: 'run', minutes: 0, day: '2026-10-29' }, NOW)).toBe('minutes')
    expect(validateActivityInput({ kind: 'run', minutes: MAX_ACTIVITY_MINUTES + 1, day: '2026-10-29' }, NOW)).toBe('minutes')
    expect(validateActivityInput({ kind: 'run', minutes: 20, day: '2026-10-21' }, NOW)).toBe('day')
    expect(validateActivityInput({ kind: 'run', minutes: 20, day: '2026-10-30' }, NOW)).toBe('day')
  })
})

describe('liveActivities', () => {
  it('drops tombstones and sorts newest day first', () => {
    const list = liveActivities([
      entry({ id: 'old', day: '2026-10-20' }),
      entry({ id: 'gone', deletedAt: '2026-10-29T16:00:00.000Z' }),
      entry({ id: 'new', day: '2026-10-28' }),
    ])
    expect(list.map((a) => a.id)).toEqual(['new', 'old'])
  })
})

describe('mergeActivity (backup import)', () => {
  it('a deletion on either side sticks, so an import never revives it', () => {
    const local = entry({ deletedAt: '2026-10-29T16:00:00.000Z', updatedAt: '2026-10-29T16:00:00.000Z' })
    const incoming = entry({ updatedAt: '2026-10-30T00:00:00.000Z' })
    expect(mergeActivity(local, incoming).deletedAt).toBe('2026-10-29T16:00:00.000Z')
    expect(mergeActivity(incoming, local).deletedAt).toBe('2026-10-29T16:00:00.000Z')
  })

  it('otherwise keeps the newer copy', () => {
    const a = entry({ minutes: 20, updatedAt: '2026-10-29T15:00:00.000Z' })
    const b = entry({ minutes: 40, updatedAt: '2026-10-29T17:00:00.000Z' })
    expect(mergeActivity(a, b).minutes).toBe(40)
    expect(mergeActivity(b, a).minutes).toBe(40)
  })

  it('adds a row missing here', () => {
    expect(mergeActivity(undefined, entry()).id).toBe('a1')
  })
})
