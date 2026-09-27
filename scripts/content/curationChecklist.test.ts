import { describe, expect, it } from 'vitest'
import { filterForReview, isHomeFriendly, parseCurationChecklist, renderChecklistMarkdown } from './curationChecklist'
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

describe('isHomeFriendly (owner rule, 2026-09-26)', () => {
  const t = (taxonomy: Partial<Exercise['taxonomy']>, id = 'lib.x') => exercise({ id, taxonomy })

  it('keeps bodyweight, no-equipment, bands, foam roller and exercise ball work below expert', () => {
    for (const equipment of ['bodyweight', 'none', 'bands', 'foam roll', 'exercise ball']) {
      expect(isHomeFriendly(t({ equipment: [equipment], level: 'intermediate' }))).toBe(true)
    }
  })

  it('keeps light weights only at beginner level', () => {
    for (const equipment of ['dumbbell', 'kettlebells', 'medicine ball']) {
      expect(isHomeFriendly(t({ equipment: [equipment], level: 'beginner' }))).toBe(true)
      expect(isHomeFriendly(t({ equipment: [equipment], level: 'intermediate' }))).toBe(false)
    }
  })

  it('drops heavy and gym equipment', () => {
    for (const equipment of ['barbell', 'e-z curl bar', 'cable', 'machine']) {
      expect(isHomeFriendly(t({ equipment: [equipment], level: 'beginner' }))).toBe(false)
    }
  })

  it('drops expert level, heavy-lifting categories and jump training', () => {
    expect(isHomeFriendly(t({ level: 'expert' }))).toBe(false)
    for (const category of ['powerlifting', 'olympic weightlifting', 'strongman', 'plyometrics']) {
      expect(isHomeFriendly(t({ category }))).toBe(false)
    }
  })

  it('keeps "other" equipment only for stretches (chair, wall, floor)', () => {
    expect(isHomeFriendly(t({ equipment: ['other'], category: 'stretching' }))).toBe(true)
    expect(isHomeFriendly(t({ equipment: ['other'], category: 'strength' }))).toBe(false)
  })

  it('always keeps anything Rae already demonstrates', () => {
    const barbell = t({ equipment: ['barbell'], level: 'intermediate' }, 'lib.Rae_Does_This')
    expect(isHomeFriendly(barbell, new Set(['lib.Rae_Does_This']))).toBe(true)
  })

  it('pre-checks the rule in the rendered checklist, which the parser then reads back', () => {
    const keep = t({ equipment: ['bodyweight'] }, 'lib.Keep_Me')
    const drop = t({ equipment: ['barbell'] }, 'lib.Drop_Me')
    const md = renderChecklistMarkdown([keep, drop], { totalCount: 2, preChecked: (e) => isHomeFriendly(e) })
    expect([...parseCurationChecklist(md)]).toEqual(['lib.Keep_Me'])
  })
})
