import { describe, expect, it } from 'vitest'
import { filterForReview, parseCurationChecklist, renderChecklistMarkdown } from './curationChecklist'
import type { Exercise } from '../../src/domain/content/types'

function exercise(overrides: { taxonomy?: Partial<Exercise['taxonomy']> } & Partial<Omit<Exercise, 'taxonomy'>> = {}): Exercise {
  const { taxonomy, ...rest } = overrides
  return {
    id: 'lib.Bodyweight_Squat',
    version: 1,
    name: 'Bodyweight Squat',
    aliases: [],
    taxonomy: { category: 'strength', equipment: ['bodyweight'], level: 'beginner', primaryMuscles: ['quadriceps'], ...taxonomy },
    setup: '',
    executionPhases: [],
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: true, time: false, hold: false },
    mediaManifest: {},
    provenance: { author: 'imported:free-exercise-db', reviewedAt: null, status: 'draft' },
    ...rest,
  } as Exercise
}

describe('filterForReview', () => {
  it('narrows to the requested level, dropping other levels', () => {
    const beginner = exercise({ id: 'lib.a', taxonomy: { level: 'beginner' } })
    const expert = exercise({ id: 'lib.b', taxonomy: { level: 'expert' } })
    expect(filterForReview([beginner, expert], { level: 'beginner' })).toEqual([beginner])
  })

  it('excludes exercises in an excluded category', () => {
    const strength = exercise({ id: 'lib.a', taxonomy: { category: 'strength' } })
    const plyo = exercise({ id: 'lib.b', taxonomy: { category: 'plyometrics' } })
    expect(filterForReview([strength, plyo], { excludedCategories: new Set(['plyometrics']) })).toEqual([strength])
  })

  it('excludes an exercise if any of its equipment is excluded', () => {
    const bodyweight = exercise({ id: 'lib.a', taxonomy: { equipment: ['bodyweight'] } })
    const barbell = exercise({ id: 'lib.b', taxonomy: { equipment: ['barbell'] } })
    expect(filterForReview([bodyweight, barbell], { excludedEquipment: new Set(['barbell']) })).toEqual([bodyweight])
  })

  it('excludes exercises with an excluded mechanic, keeping exercises with no mechanic at all', () => {
    const compound = exercise({ id: 'lib.a', taxonomy: { mechanic: 'compound' } })
    const isolation = exercise({ id: 'lib.b', taxonomy: { mechanic: 'isolation' } })
    const noMechanic = exercise({ id: 'lib.c', taxonomy: {} })
    expect(filterForReview([compound, isolation, noMechanic], { excludedMechanics: new Set(['isolation']) })).toEqual([
      compound,
      noMechanic,
    ])
  })
})

describe('renderChecklistMarkdown', () => {
  it('groups by category then equipment, sorts by name, and starts every line unchecked', () => {
    const squat = exercise({ id: 'lib.a', name: 'Bodyweight Squat', taxonomy: { category: 'strength', equipment: ['bodyweight'] } })
    const lunge = exercise({ id: 'lib.b', name: 'Walking Lunge', taxonomy: { category: 'strength', equipment: ['bodyweight'] } })
    const stretch = exercise({ id: 'lib.c', name: 'Hamstring Stretch', taxonomy: { category: 'stretching', equipment: [] } })

    const md = renderChecklistMarkdown([lunge, squat, stretch], { totalCount: 871 })

    expect(md).toContain('## strength')
    expect(md).toContain('### bodyweight')
    expect(md).toContain('## stretching')
    // sorted by name within group: Bodyweight Squat before Walking Lunge
    expect(md.indexOf('Bodyweight Squat')).toBeLessThan(md.indexOf('Walking Lunge'))
    // every line starts unchecked
    expect(md).not.toContain('- [x]')
    expect(md).toContain('- [ ] lib.a — Bodyweight Squat')
  })
})

describe('parseCurationChecklist', () => {
  it('collects only checked ids, ignoring unchecked lines and surrounding text', () => {
    const md = [
      '# Checklist',
      '## strength',
      '- [ ] lib.a — Bodyweight Squat (beginner)',
      '- [x] lib.b — Walking Lunge (beginner)',
      '- [X] lib.c — Plank (beginner)',
      'Some other line that is not a checklist item.',
    ].join('\n')

    expect(parseCurationChecklist(md)).toEqual(new Set(['lib.b', 'lib.c']))
  })

  it('returns an empty set for a checklist with nothing checked', () => {
    const md = '- [ ] lib.a — Bodyweight Squat (beginner)'
    expect(parseCurationChecklist(md)).toEqual(new Set())
  })
})
