import { beforeEach, describe, expect, it } from 'vitest'
import { db, type CustomTemplateRecord } from '../db/schema'
import { exportAll, importAll, parseExportBundle, type ExportBundle } from './exportImport'
import { deleteCustomTemplate, saveCustomTemplate } from '../db/repositories/customTemplateRepository'
import type { SessionPlan } from '../../domain/session/types'

const plan = (id: string): SessionPlan => ({
  id,
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'h',
})

const routine = (id: string, updatedAt: string, name = id): CustomTemplateRecord => ({
  id,
  version: 1,
  name,
  packId: 'custom',
  exercises: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt,
})

const progression = (reps: number, lastAdvancedAt: string | null) => ({
  exerciseId: 'ex1',
  level: 0,
  lastAdvancedAt,
  currentPrescribedReps: reps,
  currentWeightKg: null,
  consecutiveFailureStreak: 0,
  pendingCandidate: null,
})

beforeEach(async () => {
  await Promise.all([
    db.settings.clear(),
    db.checkIns.clear(),
    db.sessionPlans.clear(),
    db.sessionEvents.clear(),
    db.sessionResults.clear(),
    db.familiarity.clear(),
    db.progression.clear(),
    db.customTemplates.clear(),
    db.bodyWeight.clear(),
  ])
})

describe('importing an older backup of this same profile', () => {
  it('does not roll back progression, routines, familiarity, body weight or settings', async () => {
    await db.progression.put(progression(10, '2026-09-10T00:00:00.000Z'))
    await db.customTemplates.put(routine('custom.a', '2026-09-10T00:00:00.000Z', 'Old name'))
    await db.familiarity.put({ exerciseId: 'ex1', exposureCount: 2, lastSeenAt: '2026-09-10T00:00:00.000Z' })
    await db.bodyWeight.put({ day: '2026-09-10', kg: 70, recordedAt: '2026-09-10T08:00:00.000Z' })
    await db.settings.put({ key: 'weightUnit', value: 'lb' })
    const old = await exportAll()

    // Life goes on after the backup was made.
    await db.progression.put(progression(12, '2026-09-20T00:00:00.000Z'))
    await db.customTemplates.put(routine('custom.a', '2026-09-20T00:00:00.000Z', 'New name'))
    await db.familiarity.put({ exerciseId: 'ex1', exposureCount: 5, lastSeenAt: '2026-09-20T00:00:00.000Z' })
    await db.bodyWeight.put({ day: '2026-09-10', kg: 69, recordedAt: '2026-09-10T20:00:00.000Z' })
    await db.settings.put({ key: 'weightUnit', value: 'kg' })

    const summary = await importAll(old)

    expect(summary.state).toBe('merged')
    expect((await db.progression.get('ex1'))?.currentPrescribedReps).toBe(12)
    expect((await db.customTemplates.get('custom.a'))?.name).toBe('New name')
    expect((await db.familiarity.get('ex1'))?.exposureCount).toBe(5)
    expect((await db.bodyWeight.get('2026-09-10'))?.kg).toBe(69)
    expect((await db.settings.get('weightUnit'))?.value).toBe('kg')
  })

  it('does not bring back a routine deleted after the backup was made', async () => {
    await saveCustomTemplate({ id: 'custom.gone', version: 1, name: 'Gone', packId: 'custom', exercises: [] })
    const old = await exportAll()
    await deleteCustomTemplate('custom.gone')

    await importAll(old)

    expect(await db.customTemplates.get('custom.gone')).toBeUndefined()
  })

  it('takes the newer copy from the backup and fills in what is missing here', async () => {
    const backup = await exportAll()
    await importAll({
      ...backup,
      progression: [progression(14, '2026-09-25T00:00:00.000Z')],
      customTemplates: [routine('custom.b', '2026-09-25T00:00:00.000Z')],
      bodyWeight: [{ day: '2026-09-25', kg: 68, recordedAt: '2026-09-25T08:00:00.000Z' }],
      settings: [{ key: 'weeklySchedule', value: { mon: 'x' } }],
    })
    expect((await db.progression.get('ex1'))?.currentPrescribedReps).toBe(14)
    expect(await db.customTemplates.get('custom.b')).toBeDefined()
    expect((await db.bodyWeight.get('2026-09-25'))?.kg).toBe(68)
    expect((await db.settings.get('weeklySchedule'))?.value).toEqual({ mon: 'x' })
  })
})

describe("importing another person's backup", () => {
  it("adds their workouts as history but leaves this person's state alone", async () => {
    await db.progression.put(progression(10, '2026-09-10T00:00:00.000Z'))
    await db.settings.put({ key: 'weightUnit', value: 'kg' })
    await db.settings.put({ key: 'weeklySchedule', value: { mon: 'mine' } })
    await db.bodyWeight.put({ day: '2026-09-10', kg: 70, recordedAt: '2026-09-10T08:00:00.000Z' })
    const mine = await exportAll()

    const theirs: ExportBundle = {
      ...mine,
      profile: { id: 'kay', name: 'Kay' },
      settings: [
        { key: 'weightUnit', value: 'lb' },
        { key: 'weeklySchedule', value: { mon: 'theirs' } },
      ],
      progression: [progression(20, '2026-09-28T00:00:00.000Z')],
      bodyWeight: [{ day: '2026-09-10', kg: 60, recordedAt: '2026-09-28T08:00:00.000Z' }],
      customTemplates: [routine('custom.theirs', '2026-09-28T00:00:00.000Z')],
      familiarity: [{ exerciseId: 'ex1', exposureCount: 9, lastSeenAt: '2026-09-28T00:00:00.000Z' }],
      sessionPlans: [plan('their-session')],
    }

    const summary = await importAll(theirs)

    expect(summary.state).toBe('skipped-other-profile')
    expect((await db.progression.get('ex1'))?.currentPrescribedReps).toBe(10)
    expect((await db.settings.get('weightUnit'))?.value).toBe('kg')
    expect((await db.settings.get('weeklySchedule'))?.value).toEqual({ mon: 'mine' })
    expect((await db.bodyWeight.get('2026-09-10'))?.kg).toBe(70)
    expect(await db.customTemplates.get('custom.theirs')).toBeUndefined()
    expect(await db.familiarity.get('ex1')).toBeUndefined()
    expect(await db.sessionPlans.get('their-session')).toBeDefined()
  })
})

describe('parseExportBundle', () => {
  it('accepts a real export', async () => {
    await db.sessionPlans.put(plan('s1'))
    const bundle = await exportAll()
    expect(parseExportBundle(JSON.parse(JSON.stringify(bundle))).ok).toBe(true)
  })

  it('accepts an older bundle with no profile, routines or body weight', async () => {
    const { profile: _p, customTemplates: _c, bodyWeight: _b, ...old } = await exportAll()
    expect(parseExportBundle(old).ok).toBe(true)
  })

  it.each([
    ['a progression row with a text level', { progression: [{ ...progression(10, null), level: 'x' }] }],
    ['a body-weight row with no weight', { bodyWeight: [{ day: '2026-09-10', kg: null, recordedAt: '2026-09-10T08:00:00.000Z' }] }],
    ['an event with a numeric type', { sessionEvents: [{ eventId: 'e', sessionId: 's', type: 42, timestamp: 't', payload: {} }] }],
    ['an event with no payload object', { sessionEvents: [{ eventId: 'e', sessionId: 's', type: 'SET_COMPLETED', timestamp: 't', payload: 3 }] }],
    ['a plan with no exercises', { sessionPlans: [{ ...plan('s1'), exercises: undefined }] }],
    ['a routine with a negative set count', { customTemplates: [{ ...routine('custom.x', 't'), exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, prescription: { sets: -1, restSeconds: 60 }, order: 0, optional: false }] }] }],
  ])('rejects %s', async (_label, patch) => {
    const bundle = { ...(await exportAll()), ...patch }
    const result = parseExportBundle(bundle)
    expect(result.ok).toBe(false)
  })

  it('rejects input that is not a backup at all', () => {
    expect(parseExportBundle(null).ok).toBe(false)
    expect(parseExportBundle({ hello: 'world' }).ok).toBe(false)
  })
})
