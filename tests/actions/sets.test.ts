import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays } from '@/lib/actions/programs'
import { startSession, getLoggedSets } from '@/lib/actions/sessions'
import { logSet } from '@/lib/actions/sets'

describe('logSet', () => {
  it('re-logging the same set number updates the existing row instead of duplicating it', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const pushDay = days[0]
    const exercise = pushDay.exercises[0]

    const session = await startSession(pushDay.id)

    await logSet({
      sessionId: session.id,
      programExerciseId: exercise.id,
      setNumber: 1,
      actualWeight: 100,
      actualReps: 5,
    })

    const second = await logSet({
      sessionId: session.id,
      programExerciseId: exercise.id,
      setNumber: 1,
      actualWeight: 105,
      actualReps: 8,
    })

    const sets = await getLoggedSets(session.id)
    const matching = sets.filter(
      (s) => s.session_id === session.id && s.program_exercise_id === exercise.id && s.set_number === 1
    )

    expect(matching).toHaveLength(1)
    expect(matching[0].id).toBe(second.id)
    expect(matching[0].actual_weight).toBe(105)
    expect(matching[0].actual_reps).toBe(8)
  })
})
