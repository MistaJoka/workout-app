// tests/actions/programs.test.ts
import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays, getProgramDay } from '@/lib/actions/programs'

describe('program actions', () => {
  it('lists seeded programs', async () => {
    const programs = await getPrograms()
    expect(programs.map((p) => p.name)).toEqual(expect.arrayContaining(['Push/Pull/Legs', 'Full Body']))
  })

  it('lists days with exercises for a program', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    expect(days).toHaveLength(3)
    expect(days.map((d) => d.name)).toEqual(['Push Day', 'Pull Day', 'Legs Day'])
    expect(days[0].exercises.length).toBeGreaterThan(0)
  })

  it('loads a single day with its exercises', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const day = await getProgramDay(days[0].id)
    expect(day.name).toBe('Push Day')
    expect(day.exercises[0].exercise_name).toBe('Bench Press')
  })
})
