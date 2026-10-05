import { describe, expect, it } from 'vitest'
import { glyphSource } from './RewardGlyph'

describe('glyphSource', () => {
  it('gives the sticker or the tile picture of an art-ready icon', () => {
    expect(glyphSource('pizza', 'sticker')).toMatch(/rewards\/pizza\.webp$/)
    expect(glyphSource('pizza', 'tile')).toMatch(/rewards\/pizza-tile\.webp$/)
  })

  it('is null for a missing, unknown, or reserved icon whose art is not ready, so the emoji shows', () => {
    expect(glyphSource(undefined, 'sticker')).toBeNull()
    expect(glyphSource('not-a-real-icon', 'sticker')).toBeNull()
    expect(glyphSource('hubby-butter-noodles', 'sticker')).toBeNull()
  })
})
