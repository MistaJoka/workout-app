import { RewardGlyph } from './RewardGlyph'
import { carrots } from '../units'
import { useEffect, useRef, useState } from 'react'
import { giftLinkLocation } from '../appContext'
import { useSheetFocus } from './useSheetFocus'
import type { LoveNoteRecord, RewardRecord } from '../../infrastructure/db/schema'
import { addReward, listRewards } from '../../infrastructure/db/repositories/rewardsRepository'
import { addLoveNote, listLoveNotes } from '../../infrastructure/db/repositories/loveNotesRepository'
import { GIFT_LINK_VERSION, buildGiftLinkUrl, giftShareMessage, type GiftPayload } from '../../domain/rewards/giftLink'
import { shareLink, type ShareLinkOutcome } from './shareLink'
import { Skeleton, SkeletonList } from './Skeleton'

// Hubby Bunny's "Send to her" composer: PIN-gated by the caller
// (RewardsScreen only renders this once the shop's PIN has been verified
// for this visit, same gate as RewardEditorSheet/LoveNotesEditorSheet). He
// can be on his own phone with an empty shop -- picking from whatever
// rewards/notes already exist locally and/or writing brand new ones works
// the same either way, since "new" here just means addReward/addLoveNote
// the same way the editor sheets do, then auto-selected.

const REWARD_EMOJI_CHOICES = ['🥕', '🍓', '🍿', '🎬', '🛁', '💆', '🧹', '🍕', '☕', '🎮', '🌸', '💝']
const NOTE_EMOJI_CHOICES = ['💌', '💕', '💖', '🌸', '🎀', '☀️', '🫂', '😘', '🥰', '💐']

type Data = { rewards: RewardRecord[]; notes: LoveNoteRecord[] }

async function loadData(): Promise<Data> {
  const [rewards, notes] = await Promise.all([listRewards(), listLoveNotes()])
  return { rewards, notes }
}

export function GiftComposerSheet({ giverName, onClose }: { giverName: string; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)

  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [selectedRewardIds, setSelectedRewardIds] = useState<Set<string>>(new Set())
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [addingReward, setAddingReward] = useState(false)
  const [newRewardTitle, setNewRewardTitle] = useState('')
  const [newRewardEmoji, setNewRewardEmoji] = useState(REWARD_EMOJI_CHOICES[0])
  const [newRewardCost, setNewRewardCost] = useState(20)
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteEmoji, setNewNoteEmoji] = useState(NOTE_EMOJI_CHOICES[0])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ url: string; message: { title: string; text: string } } | null>(null)
  const [shareOutcome, setShareOutcome] = useState<ShareLinkOutcome | 'idle'>('idle')

  useEffect(() => {
    let cancelled = false
    loadData()
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleReward(id: string) {
    setSelectedRewardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleNote(id: string) {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddReward() {
    if (!newRewardTitle.trim()) return
    setError(null)
    try {
      const reward = await addReward({ title: newRewardTitle, cost: newRewardCost, emoji: newRewardEmoji })
      setData((prev) => (prev ? { ...prev, rewards: [...prev.rewards, reward] } : prev))
      setSelectedRewardIds((prev) => new Set(prev).add(reward.id))
      setNewRewardTitle('')
      setNewRewardCost(20)
      setAddingReward(false)
    } catch {
      setError("Couldn't save on this device. Try again.")
    }
  }

  async function handleAddNote() {
    if (!newNoteText.trim()) return
    setError(null)
    try {
      const note = await addLoveNote({ text: newNoteText, emoji: newNoteEmoji })
      setData((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : prev))
      setSelectedNoteIds((prev) => new Set(prev).add(note.id))
      setNewNoteText('')
      setAddingNote(false)
    } catch {
      setError("Couldn't save on this device. Try again.")
    }
  }

  function handleBuildLink() {
    if (!data) return
    setError(null)
    setBusy(true)
    try {
      const rewards = data.rewards
        .filter((r) => selectedRewardIds.has(r.id))
        .map((r) => ({ id: r.id, title: r.title, cost: r.cost, emoji: r.emoji, ...(r.icon ? { icon: r.icon } : {}) }))
      const notes = data.notes
        .filter((n) => selectedNoteIds.has(n.id))
        .map((n) => ({ id: n.id, text: n.text, emoji: n.emoji }))
      const payload: GiftPayload = { v: GIFT_LINK_VERSION, kind: 'gift', from: giverName, rewards, notes, createdAt: new Date().toISOString() }
      const url = buildGiftLinkUrl(payload, giftLinkLocation())
      setResult({ url, message: giftShareMessage(payload) })
      setShareOutcome('idle')
    } catch {
      setError("Couldn't make the link on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleShare() {
    if (!result) return
    const outcome = await shareLink({ ...result.message, url: result.url })
    setShareOutcome(outcome)
  }

  const selectedCount = selectedRewardIds.size + selectedNoteIds.size

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Send a gift link"
      >
        <p className="text-lg font-bold">Send a gift</p>
        <p className="text-sm text-ink-muted">Pick rewards and notes to send as a link. Works from any phone.</p>

        {data === null && !failed && (
          <Skeleton className="space-y-2">
            <SkeletonList rows={3} />
          </Skeleton>
        )}
        {failed && <p className="text-sm text-accent">Couldn't load your shop on this device.</p>}

        {data && !result && (
          <>
            <section className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">Rewards</p>
              {data.rewards.length === 0 && !addingReward && <p className="text-sm text-ink-muted">Nothing yet -- add one below.</p>}
              <ul className="space-y-2">
                {data.rewards.map((reward) => (
                  <li key={reward.id}>
                    <label className="card flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={selectedRewardIds.has(reward.id)}
                        onChange={() => toggleReward(reward.id)}
                      />
                      <RewardGlyph emoji={reward.emoji} icon={reward.icon} size={28} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{reward.title}</span>
                      <span className="hud-num text-sm text-ink-muted">{carrots(reward.cost)} 🥕</span>
                    </label>
                  </li>
                ))}
              </ul>
              {addingReward ? (
                <div className="card space-y-2 p-3 text-left">
                  <input
                    type="text"
                    className="input"
                    placeholder="Reward title"
                    aria-label="New reward title"
                    value={newRewardTitle}
                    onChange={(e) => setNewRewardTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {REWARD_EMOJI_CHOICES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        aria-pressed={newRewardEmoji === emoji}
                        aria-label={`Emoji ${emoji}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-control border-2 text-lg ${
                          newRewardEmoji === emoji ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
                        }`}
                        onClick={() => setNewRewardEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Cost</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-9 min-w-9 p-0"
                        aria-label="Fewer carrots"
                        onClick={() => setNewRewardCost((c) => Math.max(5, c - 5))}
                      >
                        −
                      </button>
                      <span className="hud-num w-16 text-center">{carrots(newRewardCost)} 🥕</span>
                      <button
                        type="button"
                        className="btn-secondary min-h-9 min-w-9 p-0"
                        aria-label="More carrots"
                        onClick={() => setNewRewardCost((c) => c + 5)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary flex-1" disabled={!newRewardTitle.trim()} onClick={() => void handleAddReward()}>
                      Add
                    </button>
                    <button type="button" className="btn-ghost flex-1" onClick={() => setAddingReward(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-secondary w-full" onClick={() => setAddingReward(true)}>
                  + New reward
                </button>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">Love notes</p>
              {data.notes.length === 0 && !addingNote && <p className="text-sm text-ink-muted">Nothing yet -- write one below.</p>}
              <ul className="space-y-2">
                {data.notes.map((note) => (
                  <li key={note.id}>
                    <label className="card flex items-center gap-3 p-3">
                      <input type="checkbox" className="h-5 w-5" checked={selectedNoteIds.has(note.id)} onChange={() => toggleNote(note.id)} />
                      <span aria-hidden="true" className="text-xl">
                        {note.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{note.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {addingNote ? (
                <div className="card space-y-2 p-3 text-left">
                  <textarea
                    className="input min-h-20"
                    placeholder="Note text"
                    aria-label="New note text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value.slice(0, 280))}
                    maxLength={280}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {NOTE_EMOJI_CHOICES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        aria-pressed={newNoteEmoji === emoji}
                        aria-label={`Emoji ${emoji}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-control border-2 text-lg ${
                          newNoteEmoji === emoji ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
                        }`}
                        onClick={() => setNewNoteEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary flex-1" disabled={!newNoteText.trim()} onClick={() => void handleAddNote()}>
                      Add
                    </button>
                    <button type="button" className="btn-ghost flex-1" onClick={() => setAddingNote(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-secondary w-full" onClick={() => setAddingNote(true)}>
                  + New note
                </button>
              )}
            </section>

            {error && (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn-primary btn-lg w-full" disabled={selectedCount === 0 || busy} onClick={handleBuildLink}>
              {busy ? 'Making your link…' : `Make gift link (${selectedCount})`}
            </button>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="card space-y-2 p-4 text-center">
              <p aria-hidden="true" className="text-4xl">
                🎁
              </p>
              <p className="font-semibold">{result.message.text}</p>
              <p className="break-all rounded-control bg-field-notice p-2 text-xs" data-testid="gift-link-url">
                {result.url}
              </p>
            </div>
            {shareOutcome === 'copied' && <p className="text-sm text-primary-ink" role="status">Link copied!</p>}
            {shareOutcome === 'failed' && <p className="text-sm text-accent" role="alert">Couldn't share. Copy the link above instead.</p>}
            <button type="button" className="btn-primary btn-lg w-full" onClick={() => void handleShare()}>
              Share gift link
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setResult(null)}>
              Back
            </button>
          </div>
        )}

        <button type="button" className="btn-ghost w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
