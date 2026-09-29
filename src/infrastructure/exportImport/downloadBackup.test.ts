import { describe, expect, it, vi } from 'vitest'
import { backupFileName, saveBackup } from './downloadBackup'
import type { ExportBundle } from './exportImport'

const bundle = { exportedAt: '2026-09-28T10:00:00.000Z', profile: { id: 'x', name: 'Me' } } as ExportBundle

describe('saveBackup', () => {
  it('uses the share sheet when the browser can share files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const download = vi.fn()
    const result = await saveBackup(bundle, { canShare: () => true, share }, download)
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toBe('workout-app-backup-me-2026-09-28.json')
    expect(download).not.toHaveBeenCalled()
  })

  it('reports a dismissed share sheet as cancelled, not saved', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('dismissed'), { name: 'AbortError' }))
    const download = vi.fn()
    expect(await saveBackup(bundle, { canShare: () => true, share }, download)).toBe('cancelled')
    expect(download).not.toHaveBeenCalled()
  })

  it('downloads when sharing files is unavailable or fails', async () => {
    const download = vi.fn()
    expect(await saveBackup(bundle, {}, download)).toBe('downloaded')
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    expect(await saveBackup(bundle, { canShare: () => true, share }, download)).toBe('downloaded')
    expect(download).toHaveBeenCalledTimes(2)
  })
})

describe('backupFileName', () => {
  it('names the profile and the day', () => {
    expect(backupFileName({ exportedAt: '2026-09-28T10:00:00.000Z', profile: { id: 'x', name: 'Rae & Me' } })).toBe(
      'workout-app-backup-rae-me-2026-09-28.json'
    )
  })

  it('falls back to the date alone for bundles with no profile', () => {
    expect(backupFileName({ exportedAt: '2026-09-28T10:00:00.000Z' })).toBe('workout-app-backup-2026-09-28.json')
  })
})
