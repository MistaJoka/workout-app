import { describe, expect, it } from 'vitest'
import { glyphSource } from './RewardGlyph'

describe('glyphSource', () => {
  it('gives the sticker or the tile picture of a known icon', () => {
    expect(glyphSource('pizza', 'sticker')).toMatch(/rewards\/pizza\.webp$/)
    expect(glyphSource('pizza', 'tile')).toMatch(/rewards\/pizza-tile\.webp$/)
  })
  it('is null for a missing icon or one this app does not know, so the emoji shows', () => {
    expect(glyphSource(undefined, 'sticker')).toBeNull()
    expect(glyphSource('not-a-real-icon', 'sticker')).toBeNull()
  })
})
