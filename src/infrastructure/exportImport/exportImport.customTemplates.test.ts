import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, isValidExportBundle } from './exportImport'
import { getCustomTemplate, saveCustomTemplate } from '../db/repositories/customTemplateRepository'

beforeEach(async () => {
  await db.customTemplates.clear()
})

describe('export/import of custom routines', () => {
  it('round-trips a custom routine through export and import', async () => {
    await saveCustomTemplate({
      id: 'custom.abc',
      version: 1,
      name: 'Leg day',
      packId: 'custom',
      exercises: [
        { exerciseId: 'lib.Barbell_Squat', exerciseVersion: 1, prescription: { sets: 3, reps: 8, restSeconds: 60 }, order: 0, optional: false },
      ],
    })
    const bundle = await exportAll()
    expect(bundle.customTemplates?.map((t) => t.id)).toEqual(['custom.abc'])

    await db.customTemplates.clear()
    await importAll(bundle)
    expect((await getCustomTemplate('custom.abc'))?.name).toBe('Leg day')
  })

  it('still accepts a pre-v2 bundle that has no customTemplates field', async () => {
    const bundle = await exportAll()
    const { customTemplates: _dropped, ...legacy } = bundle
    expect(isValidExportBundle(legacy)).toBe(true)
    await expect(importAll(legacy)).resolves.toBeUndefined()
  })
})
