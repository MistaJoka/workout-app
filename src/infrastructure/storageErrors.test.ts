import { describe, expect, it } from 'vitest'
import { isQuotaError, storageErrorMessage } from './storageErrors'

const named = (name: string, inner?: Error) => Object.assign(new Error(name), { name, ...(inner ? { inner } : {}) })

describe('isQuotaError', () => {
  it('recognises a quota error directly and wrapped by Dexie', () => {
    expect(isQuotaError(named('QuotaExceededError'))).toBe(true)
    expect(isQuotaError(named('AbortError', named('QuotaExceededError')))).toBe(true)
    expect(isQuotaError(named('ConstraintError'))).toBe(false)
    expect(isQuotaError('nope')).toBe(false)
  })
})

describe('storageErrorMessage', () => {
  it('says the phone is out of space for a quota error, and a plain local message otherwise', () => {
    expect(storageErrorMessage(named('QuotaExceededError'), 'save')).toMatch(/space/i)
    expect(storageErrorMessage(new Error('boom'), 'save')).toBe("Couldn't save on this device. Try again.")
    expect(storageErrorMessage(new Error('boom'), 'read')).toBe("Couldn't read this device's data. Try again.")
  })
})
