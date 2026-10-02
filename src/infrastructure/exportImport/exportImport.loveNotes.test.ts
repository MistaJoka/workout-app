import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, isValidExportBundle } from './exportImport'
import { addLoveNote, listLoveNotes, updateLoveNote } from '../db/repositories/loveNotesRepository'
import { evaluateLoveNoteUnlockForSession } from '../db/repositories/loveNotesRepository'

beforeEach(async () => {
  await db.loveNotes.clear()
  await db.settings.clear()
})

describe("export/import of Hubby Bunny's love notes", () => {
  it('round-trips a locked note through export and import', async () => {
    const note = await addLoveNote({ text: 'Proud of you', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const bundle = await exportAll()
    expect(bundle.loveNotes?.map((n) => n.id)).toEqual([note.id])

    await db.loveNotes.clear()
    await importAll(bundle)
    expect((await listLoveNotes())[0]).toMatchObject({ text: 'Proud of you', unlockedAt: null, readAt: null })
  })

  it('merges a note newest-wins by updatedAt, for its text/emoji', async () => {
    const note = await addLoveNote({ text: 'First draft', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const bundle = await exportAll() // Carries the original (older) version.

    await updateLoveNote(note.id, { text: 'Second draft' }, '2026-09-10T00:00:00.000Z')
    await importAll(bundle)
    expect((await listLoveNotes())[0].text).toBe('Second draft')

    const newer = { ...bundle.loveNotes![0], text: 'Third draft', updatedAt: '2026-09-20T00:00:00.000Z' }
    await importAll({ ...bundle, loveNotes: [newer] })
    expect((await listLoveNotes())[0].text).toBe('Third draft')
  })

  it('preserves unlocked/read state even when the incoming row is newer and never saw the unlock', async () => {
    const note = await addLoveNote({ text: 'Proud of you', emoji: '💌' }, '2026-09-01T00:00:00.000Z')
    const baseBundle = await exportAll() // Same profile as the import below -- current state merges.

    await evaluateLoveNoteUnlockForSession('session-her', {
      allSessionEndedAt: ['2026-09-05T00:00:00.000Z'],
      goalMetThisSession: true,
      thisSessionEndedAt: '2026-09-05T00:00:00.000Z',
    })
    const unlocked = (await listLoveNotes())[0]
    expect(unlocked.unlockedAt).toBe('2026-09-05T00:00:00.000Z')

    // An incoming row with a newer text edit, from a copy that never ran
    // the unlock roll for this note (so its own fields are still locked).
    const incoming = {
      ...baseBundle,
      loveNotes: [{ ...note, text: 'Proud of you, updated', updatedAt: '2026-09-11T00:00:00.000Z', unlockedAt: null, unlockedBySessionId: null, readAt: null }],
    }
    expect(isValidExportBundle(incoming)).toBe(true)
    await importAll(incoming)

    const merged = (await listLoveNotes())[0]
    expect(merged.text).toBe('Proud of you, updated') // newer text wins
    expect(merged.unlockedAt).toBe('2026-09-05T00:00:00.000Z') // but unlock state is sticky
    expect(merged.unlockedBySessionId).toBe('session-her')
  })

  it('an other-profile backup leaves the local love-note queue untouched', async () => {
    const local = await addLoveNote({ text: 'Mine', emoji: '💌' })
    const theirsBundle = {
      exportedAt: '2026-09-01T00:00:00.000Z',
      version: 1,
      profile: { id: 'someone-else', name: 'Someone Else' },
      settings: [],
      checkIns: [],
      sessionPlans: [],
      sessionEvents: [],
      sessionResults: [],
      familiarity: [],
      progression: [],
      loveNotes: [
        {
          id: 'their-note',
          text: 'Not for this profile',
          emoji: '❓',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          unlockedAt: null,
          unlockedBySessionId: null,
          readAt: null,
        },
      ],
    }
    expect(isValidExportBundle(theirsBundle)).toBe(true)
    const summary = await importAll(theirsBundle)
    expect(summary).toEqual({ state: 'skipped-other-profile' })
    expect((await listLoveNotes()).map((n) => n.id)).toEqual([local.id])
  })

  it('still accepts a pre-v5 bundle that has no loveNotes field', async () => {
    const bundle = await exportAll()
    const { loveNotes: _l, ...legacy } = bundle
    expect(isValidExportBundle(legacy)).toBe(true)
    await expect(importAll(legacy)).resolves.toEqual({ state: 'merged' })
  })
})
