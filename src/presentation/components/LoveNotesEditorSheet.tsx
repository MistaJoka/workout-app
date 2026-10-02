import { useRef, useState } from 'react'
import { useSheetFocus } from './useSheetFocus'
import type { LoveNoteRecord } from '../../infrastructure/db/schema'

// Hubby Bunny's note editor, PIN-gated by the caller (LoveNotesBoxScreen
// only renders this once the shop's PIN has been verified for this visit --
// same gate, same PinRecord, as RewardEditorSheet). He sees text for both
// locked and opened notes (they're his own words); she never sees this.
// Shown in two groups -- locked / opened -- so he can tell at a glance
// which have landed, without this screen ever stating their unlock order.

const EMOJI_CHOICES = ['💌', '💕', '💖', '🌸', '🎀', '☀️', '🫂', '😘', '🥰', '💐']
const MAX_LENGTH = 280

export type LoveNoteDraft = { text: string; emoji: string }

export function LoveNotesEditorSheet({
  notes,
  giverName,
  busyId,
  error,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  notes: LoveNoteRecord[]
  giverName: string
  busyId: string | null
  error: string | null
  onAdd: (input: LoveNoteDraft) => void
  onUpdate: (id: string, patch: Partial<Pick<LoveNoteRecord, 'text' | 'emoji'>>) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<LoveNoteDraft>({ text: '', emoji: EMOJI_CHOICES[0] })

  function startAdd() {
    setDraft({ text: '', emoji: EMOJI_CHOICES[0] })
    setAdding(true)
    setEditingId(null)
  }

  function startEdit(note: LoveNoteRecord) {
    setDraft({ text: note.text, emoji: note.emoji })
    setEditingId(note.id)
    setAdding(false)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
  }

  function saveDraft() {
    if (!draft.text.trim()) return
    if (editingId) onUpdate(editingId, draft)
    else onAdd(draft)
    cancelForm()
  }

  const formOpen = adding || editingId != null
  const locked = notes.filter((n) => !n.unlockedAt)
  const opened = notes.filter((n) => n.unlockedAt)

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${giverName}'s love notes, editing`}
      >
        <p className="text-lg font-bold">Write a love note</p>
        <p className="text-sm text-ink-muted">A surprise unlocks for her after a workout, one at a time.</p>

        {!formOpen && (
          <button type="button" className="btn-primary w-full" onClick={startAdd}>
            + Write a note
          </button>
        )}

        {formOpen && (
          <div className="card space-y-3 p-3 text-left">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Note</span>
              <textarea
                className="input min-h-24"
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value.slice(0, MAX_LENGTH) }))}
                maxLength={MAX_LENGTH}
                autoFocus
                aria-label="Note text"
              />
              <span className="block text-right text-xs text-ink-muted">
                {draft.text.length}/{MAX_LENGTH}
              </span>
            </label>
            <div className="space-y-1">
              <span className="text-sm font-semibold">Emoji</span>
              <div className="flex flex-wrap gap-2">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={draft.emoji === emoji}
                    aria-label={`Emoji ${emoji}`}
                    className={`flex h-11 w-11 items-center justify-center rounded-control border-2 text-xl ${
                      draft.emoji === emoji ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
                    }`}
                    onClick={() => setDraft((d) => ({ ...d, emoji }))}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" disabled={!draft.text.trim()} onClick={saveDraft}>
                {editingId ? 'Save' : 'Add to queue'}
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={cancelForm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!formOpen && locked.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Locked ({locked.length})</p>
            <ul className="space-y-2">
              {locked.map((note) => (
                <NoteRow key={note.id} note={note} busy={busyId === note.id} onEdit={() => startEdit(note)} onRemove={() => onRemove(note.id)} />
              ))}
            </ul>
          </section>
        )}

        {!formOpen && opened.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Opened ({opened.length})</p>
            <ul className="space-y-2">
              {opened.map((note) => (
                <NoteRow key={note.id} note={note} busy={busyId === note.id} onEdit={() => startEdit(note)} onRemove={() => onRemove(note.id)} />
              ))}
            </ul>
          </section>
        )}

        {!formOpen && notes.length === 0 && <p className="text-sm text-ink-muted">Nothing in the queue yet. Write the first one above.</p>}

        <button type="button" className="btn-ghost w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

function NoteRow({
  note,
  busy,
  onEdit,
  onRemove,
}: {
  note: LoveNoteRecord
  busy: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <li className="card space-y-2 p-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-2xl">
          {note.emoji}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{note.text}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary min-h-11 flex-1 px-3" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn-danger min-h-11 flex-1 px-3" disabled={busy} onClick={onRemove}>
          Delete
        </button>
      </div>
    </li>
  )
}
