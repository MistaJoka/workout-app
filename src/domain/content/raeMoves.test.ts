import { describe, expect, it } from 'vitest'
import { raeMoves } from './fixtures/raeMoves'
import { validateContentPack } from './schema'
import { getExercise, getExercises, loadLibrary } from './catalog'

describe('Rae moves', () => {
  it('are valid exercises', () => {
    const pack = {
      id: 'rae.moves',
      version: 1,
      name: 'Rae moves',
      dependsOn: [],
      exerciseIds: raeMoves.map((e) => e.id),
      templateIds: [],
    }
    expect(validateContentPack(pack, raeMoves, []).errors).toEqual([])
    expect(new Set(raeMoves.map((e) => e.id)).size).toBe(15)
  })

  it('resolve through the catalog and appear in the Library', async () => {
    const id = 'rae.chair-squat-tap'
    expect((await getExercise(id))?.name).toBe('Chair Squat Tap')
    expect((await getExercises([id])).get(id)?.name).toBe('Chair Squat Tap')
    const library = await loadLibrary()
    const listed = library.filter((e) => e.id.startsWith('rae.')).map((e) => e.id)
    expect(listed).toHaveLength(13)
    expect(listed).toContain('rae.seated-march')
    expect(listed).not.toContain('rae.chair-sit-to-stand-hands-clasped')
    expect(listed).not.toContain('rae.chair-sit-to-stand-hands-on-thighs')
  })

  it('keeps the dropped duplicates resolvable for routines that already use them', async () => {
    expect((await getExercise('rae.chair-sit-to-stand-hands-clasped'))?.name).toBe('Chair Sit-to-Stand, Hands Clasped')
  })
})
