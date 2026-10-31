import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LoveNoteRecord } from '../../infrastructure/db/schema'
import { markLoveNoteRead } from '../../infrastructure/db/repositories/loveNotesRepository'
import { catchUpThenLoadUnread, loadLoveNoteUnlockForSession } from '../../application/rewardsService'
import { LoveNoteEnvelope } from './LoveNoteEnvelope'

// Love notes on screen: Today's unread badge, Complete's "a note from
// Hubby Bunny" RewardItem, and the small loaders both (and the notes box)
// share. Mirrors CarrotCelebration.tsx's load*/component split.

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
