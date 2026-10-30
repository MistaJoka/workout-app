import { describe, expect, it } from 'vitest'
import { hidesUpdateToast } from './UpdateToast'

describe('hidesUpdateToast', () => {
  it('waits during a workout and on Start, shows elsewhere', () => {
    expect(hidesUpdateToast('#/session/abc')).toBe(true)
    expect(hidesUpdateToast('#/checkin/fs.full-body-a')).toBe(true)
    expect(hidesUpdateToast('#/')).toBe(false)
    expect(hidesUpdateToast('#/library')).toBe(false)
    expect(hidesUpdateToast('')).toBe(false)
  })
})
