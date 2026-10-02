import { describe, expect, it } from 'vitest'
import { RAE_EXPRESSIONS } from '../../presentation/components/Rae'
import { RAE_STORY, nextChapter, unlockedChapters } from './raeStory'

function wordCount(chapter: (typeof RAE_STORY)[number]): number {
  return chapter.paragraphs.join(' ').split(/\s+/).filter(Boolean).length
}

describe('Rae story content', () => {
  it('has ten chapters, numbered in order starting at 1', () => {
    expect(RAE_STORY).toHaveLength(10)
    expect(RAE_STORY.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('has strictly increasing unlock thresholds', () => {
    for (let i = 1; i < RAE_STORY.length; i++) {
      expect(RAE_STORY[i].unlockAt).toBeGreaterThan(RAE_STORY[i - 1].unlockAt)
    }
  })

  it('each chapter has 3-5 short paragraphs, 90 words or fewer total', () => {
    for (const chapter of RAE_STORY) {
      expect(chapter.paragraphs.length).toBeGreaterThanOrEqual(3)
      expect(chapter.paragraphs.length).toBeLessThanOrEqual(5)
      expect(wordCount(chapter)).toBeLessThanOrEqual(90)
      expect(wordCount(chapter)).toBeGreaterThan(0)
    }
  })

  it('names a real Rae expression for every chapter', () => {
    for (const chapter of RAE_STORY) {
      expect(RAE_EXPRESSIONS).toContain(chapter.expression)
    }
  })

  it('every chapter has a non-empty title', () => {
    for (const chapter of RAE_STORY) {
      expect(chapter.title.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('unlockedChapters', () => {
  it('unlocks nothing before the first threshold', () => {
    expect(unlockedChapters(0)).toEqual([])
  })

  it('unlocks exactly the leading run of chapters whose threshold is met', () => {
    expect(unlockedChapters(1).map((c) => c.n)).toEqual([1])
    expect(unlockedChapters(4).map((c) => c.n)).toEqual([1, 2, 3])
    expect(unlockedChapters(7).map((c) => c.n)).toEqual([1, 2, 3, 4, 5])
    expect(unlockedChapters(50).map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('never shrinks as the finished count grows (monotonic)', () => {
    let previousLength = 0
    for (let count = 0; count <= 60; count++) {
      const length = unlockedChapters(count).length
      expect(length).toBeGreaterThanOrEqual(previousLength)
      previousLength = length
    }
  })

  it('unlocks everything well past the last threshold', () => {
    expect(unlockedChapters(1000)).toHaveLength(10)
  })
})

describe('nextChapter', () => {
  it('is the first chapter before any workout is finished', () => {
    expect(nextChapter(0)?.n).toBe(1)
  })

  it('advances exactly as thresholds are crossed', () => {
    expect(nextChapter(1)?.n).toBe(2)
    expect(nextChapter(4)?.n).toBe(4)
    expect(nextChapter(5)?.n).toBe(5)
  })

  it('is null once every chapter has unlocked', () => {
    expect(nextChapter(50)).toBeNull()
    expect(nextChapter(500)).toBeNull()
  })

  it('always points at the chapter right after unlockedChapters', () => {
    for (let count = 0; count <= 60; count++) {
      const unlockedCount = unlockedChapters(count).length
      const next = nextChapter(count)
      if (unlockedCount === RAE_STORY.length) {
        expect(next).toBeNull()
      } else {
        expect(next?.n).toBe(unlockedCount + 1)
      }
    }
  })
})
