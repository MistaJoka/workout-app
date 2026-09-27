import { describe, expect, it } from 'vitest'
import { raeChairMoves } from './fixtures/raeChairMoves'
import { validateContentPack } from './schema'
import { getExercise, getExercises, loadLibrary } from './catalog'

describe('Rae chair moves', () => {
  it('are valid exercises', () => {
    const pack = {
      id: 'rae.chair-moves',
      version: 1,
      name: 'Rae chair moves',
      dependsOn: [],
      exerciseIds: raeChairMoves.map((e) => e.id),
      templateIds: [],
    }
    expect(validateContentPack(pack, raeChairMoves, []).errors).toEqual([])
    expect(new Set(raeChairMoves.map((e) => e.id)).size).toBe(7)
  })

  it('resolve through the catalog and appear in the Library', async () => {
    const id = 'rae.chair-squat-tap'
    expect((await getExercise(id))?.name).toBe('Chair Squat Tap')
    expect((await getExercises([id])).get(id)?.name).toBe('Chair Squat Tap')
    const library = await loadLibrary()
    for (const move of raeChairMoves) expect(library.some((e) => e.id === move.id)).toBe(true)
  })
})
