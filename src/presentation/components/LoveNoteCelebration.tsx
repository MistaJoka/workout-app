import { useEffect, useState } from 'react'
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
import { Link } from 'react-router-dom'
import type { LoveNoteRecord } from '../../infrastructure/db/schema'
import {
  catchUpLoveNoteUnlocks,
  evaluateLoveNoteUnlockForSession,
  listLoveNotes,
  markLoveNoteRead,
} from '../../infrastructure/db/repositories/loveNotesRepository'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { DEFAULT_GIVER_NAME } from '../../domain/rewards/pin'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { goalBloomForSession, goalBlooms } from '../../domain/progress/goalBloom'
import { LoveNoteEnvelope } from './LoveNoteEnvelope'

// Love notes on screen: Today's unread badge, Complete's "a note from
// Hubby Bunny" RewardItem, and the small loaders both (and the notes box)
// share. Mirrors CarrotCelebration.tsx's load*/component split.

const GIVER_NAME_KEY = 'rewardsGiverName'

async function loadGiverName(): Promise<string> {
  return (await getSetting<string>(GIVER_NAME_KEY)) ?? DEFAULT_GIVER_NAME
}

// This workout's surprise, if any: evaluates (idempotently) whether a
// locked note unlocks and returns it, alongside the giver's current name.
export async function loadLoveNoteUnlockForSession(
  sessionId: string
): Promise<{ note: LoveNoteRecord; giverName: string } | null> {
  const [{ results }, schedule, giverName] = await Promise.all([getAllSessionHistory(), getWeeklySchedule(), loadGiverName()])
  const goalMetThisSession = goalBloomForSession(results, await loadWeekGoals({ results, schedule }), sessionId) !== null
  const thisSessionEndedAt = results.find((r) => r.sessionId === sessionId)?.endedAt ?? new Date().toISOString()
  const note = await evaluateLoveNoteUnlockForSession(sessionId, {
    allSessionEndedAt: results.map((r) => r.endedAt),
    goalMetThisSession,
    thisSessionEndedAt,
  })
  return note ? { note, giverName } : null
}

// Workouts that never reached Complete (auto-finished, or the app closed
// first) get their chance at a note here, then any unread note shows.
async function catchUpThenLoadUnread(): Promise<LoveNoteRecord | null> {
  try {
    // Nothing locked (the usual case): skip reading history at all.
    if (!(await listLoveNotes()).some((n) => n.unlockedAt === null)) return loadUnreadLoveNote()
    const [{ results }, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
    const goalSessions = new Set(goalBlooms(results, await loadWeekGoals({ results, schedule })).map((b) => b.sessionId))
    await catchUpLoveNoteUnlocks(results.map((r) => ({ sessionId: r.sessionId, endedAt: r.endedAt, goalMet: goalSessions.has(r.sessionId) })))
  } catch {
    // A failed catch-up never hides an unread note that's already there.
  }
  return loadUnreadLoveNote()
}

export async function loadUnreadLoveNote(): Promise<LoveNoteRecord | null> {
  const notes = await listLoveNotes()
  return notes.find((n) => n.unlockedAt && !n.readAt) ?? null
}

export async function loadLoveNotesSummary(): Promise<{ opened: number; total: number; sealed: number }> {
  const notes = await listLoveNotes()
  const opened = notes.filter((n) => n.unlockedAt).length
  return { opened, total: notes.length, sealed: notes.length - opened }
}

// Today's small badge, near the carrot chip: only renders once an unread
// note exists, same "renders nothing while loading/absent" convention as
// CarrotBalanceChip -- it never blocks the rest of the header.
export function LoveNoteBadge() {
  const [unread, setUnread] = useState<LoveNoteRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    catchUpThenLoadUnread()
      .then((n) => {
        if (!cancelled) setUnread(n)
      })
      .catch(() => {
        if (!cancelled) setUnread(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!unread) return null

  return (
    <Link
      to="/notes"
      className="chip bg-field-notice gap-1 px-3"
      aria-label="Unread love note. Open your love notes"
      data-testid="love-note-badge"
    >
      <span aria-hidden="true">💌</span>
    </Link>
  )
}

// Complete's "💌 A note from Hubby Bunny!" row: renders nothing until a
// note actually unlocked this session (the common case), otherwise a tap
// away from the full-screen envelope moment. Closing it marks the note read.
export function LoveNoteRewardItem({ sessionId }: { sessionId: string }) {
  const [unlock, setUnlock] = useState<{ note: LoveNoteRecord; giverName: string } | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadLoveNoteUnlockForSession(sessionId)
      .then((result) => {
        if (!cancelled) setUnlock(result)
      })
      .catch(() => {
        if (!cancelled) setUnlock(null)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function handleClose() {
    if (unlock) await markLoveNoteRead(unlock.note.id).catch(() => {})
    setOpen(false)
  }

  if (!unlock) return null

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        onClick={() => setOpen(true)}
        data-testid="love-note-reward-item"
      >
        <span aria-hidden="true" className="text-2xl">
          💌
        </span>
        <span className="font-semibold">A note from {unlock.giverName}!</span>
      </button>
      {open && <LoveNoteEnvelope note={unlock.note} giverName={unlock.giverName} onClose={() => void handleClose()} />}
    </>
  )
}
