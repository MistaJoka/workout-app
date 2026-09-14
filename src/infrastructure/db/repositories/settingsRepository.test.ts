// src/infrastructure/db/repositories/settingsRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { getSetting, setSetting } from './settingsRepository'

beforeEach(async () => {
  await db.settings.clear()
})

describe('settingsRepository', () => {
  it('round-trips a stored value: setSetting then getSetting returns the same value', async () => {
    await setSetting('someKey', { some: 'value' })
    const loaded = await getSetting<{ some: string }>('someKey')
    expect(loaded).toEqual({ some: 'value' })
  })

  it('returns undefined for a key that was never set', async () => {
    const loaded = await getSetting('never-set-key')
    expect(loaded).toBeUndefined()
  })
})
