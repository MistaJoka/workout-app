// tests/actions/sessions.test.ts
import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays } from '@/lib/actions/programs'
import { startSession, endSession, getSession, getLoggedSets } from '@/lib/actions/sessions'
import { logSet } from '@/lib/actions/sets'

describe('session and set actions', () => {
  it('starts a session, logs a set, and ends the session', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const pushDay = days[0]

    const session = await startSession(pushDay.id)
    expect(session.program_day_id).toBe(pushDay.id)
    expect(session.ended_at).toBeNull()

    const exercise = pushDay.exercises[0]
    const loggedSet = await logSet({
      sessionId: session.id,
      programExerciseId: exercise.id,
      setNumber: 1,
      actualWeight: 135,
      actualReps: 8,
    })
    expect(loggedSet.actual_weight).toBe(135)
    expect(loggedSet.actual_reps).toBe(8)

    const sets = await getLoggedSets(session.id)
    expect(sets).toHaveLength(1)

    await endSession(session.id)
    const ended = await getSession(session.id)
    expect(ended.ended_at).not.toBeNull()
  })
})
