import { describe, expect, it } from 'vitest'
import {
  ROOM_UNLOCKS,
  labelFor,
  newestUnlock,
  nextRoomUnlock,
  resolveRoomLevel,
  shouldRevealNewestUnlock,
  unlockedRoomItems,
} from './roomUnlocks'

describe('ROOM_UNLOCKS', () => {
  it('is ordered by ascending level with no duplicate items or levels', () => {
    for (let i = 1; i < ROOM_UNLOCKS.length; i++) {
      expect(ROOM_UNLOCKS[i].level).toBeGreaterThan(ROOM_UNLOCKS[i - 1].level)
    }
    expect(new Set(ROOM_UNLOCKS.map((u) => u.item)).size).toBe(ROOM_UNLOCKS.length)
  })
})

describe('unlockedRoomItems', () => {
  it('is empty below the first unlock level', () => {
    expect(unlockedRoomItems(1)).toEqual([])
  })

  it('includes every unlock at or below the given level, in order', () => {
    expect(unlockedRoomItems(5)).toEqual(['wallFrame', 'cushion', 'bookshelf'])
  })

  it('includes everything once past the last unlock', () => {
    expect(unlockedRoomItems(99)).toEqual(ROOM_UNLOCKS.map((u) => u.item))
  })

  it('is earned by effort and never lost: higher level is a strict superset', () => {
    const at5 = unlockedRoomItems(5)
    const at9 = unlockedRoomItems(9)
    for (const item of at5) expect(at9).toContain(item)
  })
})

describe('nextRoomUnlock', () => {
  it('names the first unlock before level 2', () => {
    expect(nextRoomUnlock(1)).toEqual({ item: 'wallFrame', level: 2 })
  })

  it('names the following unlock right after one is earned', () => {
    expect(nextRoomUnlock(5)).toEqual({ item: 'lightsUpgrade', level: 7 })
  })

  it('is null once every unlock is earned', () => {
    expect(nextRoomUnlock(15)).toBeNull()
    expect(nextRoomUnlock(200)).toBeNull()
  })
})

describe('labelFor', () => {
  it('gives a human label for every unlock item', () => {
    for (const u of ROOM_UNLOCKS) expect(labelFor(u.item)).toBe(u.label)
  })
})

describe('newestUnlock', () => {
  it('is null before the first unlock', () => {
    expect(newestUnlock(1)).toBeNull()
  })

  it('is the highest-level unlock reached, not the first', () => {
    expect(newestUnlock(6)).toEqual({ item: 'bookshelf', level: 5, label: 'Bookshelf' })
  })

  it('is the last unlock once everything is earned', () => {
    expect(newestUnlock(999)).toEqual(ROOM_UNLOCKS[ROOM_UNLOCKS.length - 1])
  })
})

describe('shouldRevealNewestUnlock', () => {
  it('never reveals when nothing is unlocked', () => {
    expect(shouldRevealNewestUnlock(null, null)).toBe(false)
  })

  it('reveals the first time something is unlocked, even with no prior seen level', () => {
    expect(shouldRevealNewestUnlock(null, 2)).toBe(true)
  })

  it('does not reveal again once the current newest has been seen', () => {
    expect(shouldRevealNewestUnlock(2, 2)).toBe(false)
  })

  it('reveals again once a further unlock becomes the newest', () => {
    expect(shouldRevealNewestUnlock(2, 5)).toBe(true)
  })
})

describe('resolveRoomLevel', () => {
  it('uses the real level with no override', () => {
    expect(resolveRoomLevel(3, '')).toBe(3)
  })

  it('lets an explicit ?level= override win, for screenshots/e2e', () => {
    expect(resolveRoomLevel(3, '?level=15')).toBe(15)
  })

  it('ignores a non-numeric or sub-1 override rather than blanking the room', () => {
    expect(resolveRoomLevel(3, '?level=nope')).toBe(3)
    expect(resolveRoomLevel(3, '?level=0')).toBe(3)
    expect(resolveRoomLevel(3, '?level=-2')).toBe(3)
    expect(resolveRoomLevel(3, '?level=2.5')).toBe(3)
  })
})
