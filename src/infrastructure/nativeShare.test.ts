import { beforeEach, describe, expect, it, vi } from 'vitest'

const fs = vi.hoisted(() => ({ writeFile: vi.fn(async () => ({ uri: 'file:///cache/share/x' })) }))
const share = vi.hoisted(() => ({ share: vi.fn(async () => ({ activityType: 'com.google.android.apps.docs' })) }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: fs,
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}))
vi.mock('@capacitor/share', () => ({ Share: share }))

import { shareFileNative } from './nativeShare'

type Written = { path: string; data: string; directory: string; encoding?: string; recursive?: boolean }
const written = () => (fs.writeFile.mock.calls.at(-1) as unknown as [Written])[0]
const shared = () => (share.share.mock.calls.at(-1) as unknown as [{ files: string[]; title?: string; text?: string }])[0]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('shareFileNative', () => {
  it('writes text to the cache as UTF-8 and opens the share sheet on that file', async () => {
    expect(await shareFileNative('{"a":1}', 'backup.json', { title: 'Workout backup' })).toBe('shared')
    expect(written()).toMatchObject({ path: 'share/backup.json', data: '{"a":1}', directory: 'CACHE', encoding: 'utf8' })
    expect(shared()).toMatchObject({ files: ['file:///cache/share/x'], title: 'Workout backup' })
  })

  it('writes a Blob as base64', async () => {
    await shareFileNative(new Blob([new Uint8Array([1, 2, 3, 250])]), 'card.png')
    expect(written().data).toBe(btoa(String.fromCharCode(1, 2, 3, 250)))
    expect(written().encoding).toBeUndefined()
  })

  it('passes a message along with the file', async () => {
    await shareFileNative('x', 'coupon.png', { text: 'Code ABC' })
    expect(shared().text).toBe('Code ABC')
  })

  it("reports a dismissed share sheet as 'cancelled'", async () => {
    share.share.mockRejectedValueOnce(new Error('Share canceled'))
    expect(await shareFileNative('x', 'a.json')).toBe('cancelled')
  })

  it('lets any other failure through, so nothing claims a save that never happened', async () => {
    fs.writeFile.mockRejectedValueOnce(new Error('disk full'))
    await expect(shareFileNative('x', 'a.json')).rejects.toThrow('disk full')
  })
})
