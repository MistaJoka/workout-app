import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays } from '@/lib/actions/programs'
import { startSession, endSession } from '@/lib/actions/sessions'
import { logSet } from '@/lib/actions/sets'
import { getHistory, getExerciseHistory } from '@/lib/actions/history'

describe('history actions', () => {
  it('summarizes a completed session and tracks per-exercise history', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const pushDay = days[0]
    const benchPress = pushDay.exercises.find((e) => e.exercise_name === 'Bench Press')!

    const session = await startSession(pushDay.id)
    await logSet({
      sessionId: session.id,
      programExerciseId: benchPress.id,
      setNumber: 1,
      actualWeight: 140,
      actualReps: 8,
    })
    await endSession(session.id)

    const history = await getHistory()
    const summary = history.find((h) => h.id === session.id)!
    expect(summary.programDayName).toBe('Push Day')
    expect(summary.totalSetsLogged).toBeGreaterThanOrEqual(1)

    const points = await getExerciseHistory('Bench Press')
    expect(points.some((p) => p.actualWeight === 140)).toBe(true)
  })
})
