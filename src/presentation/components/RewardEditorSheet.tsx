import { workoutsFor } from '../../domain/rewards/pricing'
import { useRef, useState } from 'react'
import { useSheetFocus } from './useSheetFocus'
import type { RewardRecord } from '../../infrastructure/db/schema'

// Hubby Bunny's editor, PIN-gated by the caller (RewardsScreen only renders
// this once the PIN has been verified for this visit). Add/edit/remove the
// shop's catalog; a small fixed emoji set and a cost stepper keep the form
// one-finger-friendly; cute starter suggestions are offered only while the
// shop is empty, one tap to add -- never pre-created.

const EMOJI_CHOICES = ['🥕', '🍓', '🍿', '🎬', '🛁', '💆', '🧹', '🍕', '☕', '🎮', '🌸', '💝']

export type RewardDraft = { title: string; cost: number; emoji: string }

const STARTER_SUGGESTIONS: RewardDraft[] = [
  // Priced in workouts (~25 carrots each, domain/rewards/pricing.ts): a mix
  // of little treats, a bigger one and a big dream to save for.
  { title: 'No-dishes pass', emoji: '🧹', cost: 20 },
  { title: 'Movie night pick', emoji: '🎬', cost: 25 },
  { title: 'Foot rub', emoji: '💆', cost: 30 },
  { title: 'Breakfast in bed', emoji: '🍳', cost: 60 },
  { title: 'Dinner date', emoji: '🍽️', cost: 150 },
]

// One tap to a sensible price per tier (domain/rewards/pricing.ts limits).
const PRICE_PRESETS = [
  { label: 'Little', cost: 25 },
  { label: 'Bigger', cost: 60 },
  { label: 'Big', cost: 150 },
] as const

export function RewardEditorSheet({
  rewards,
  giverName,
  busyId,
  error,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  rewards: RewardRecord[]
  giverName: string
  busyId: string | null
  error: string | null
  onAdd: (input: RewardDraft) => void
  onUpdate: (id: string, patch: Partial<Pick<RewardRecord, 'title' | 'cost' | 'emoji' | 'active'>>) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<RewardDraft>({ title: '', cost: 25, emoji: EMOJI_CHOICES[0] })

  function startAdd(preset?: Partial<RewardDraft>) {
    setDraft({ title: '', cost: 25, emoji: EMOJI_CHOICES[0], ...preset })
    setAdding(true)
    setEditingId(null)
  }

  function startEdit(reward: RewardRecord) {
    setDraft({ title: reward.title, cost: reward.cost, emoji: reward.emoji })
    setEditingId(reward.id)
    setAdding(false)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
  }

  function saveDraft() {
    if (!draft.title.trim()) return
    if (editingId) onUpdate(editingId, draft)
    else onAdd(draft)
    cancelForm()
  }

  const formOpen = adding || editingId != null

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${giverName}'s reward shop, editing`}
      >
        <p className="text-lg font-bold">{giverName}'s shop</p>
        <p className="text-sm text-ink-muted">Add, edit or remove what she can redeem carrots for.</p>

        {!formOpen && (
          <button type="button" className="btn-primary w-full" onClick={() => startAdd()}>
            + Add a reward
          </button>
        )}

        {!formOpen && rewards.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Cute starter ideas, one tap to add:</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_SUGGESTIONS.map((s) => (
                <button key={s.title} type="button" className="chip" onClick={() => onAdd(s)}>
                  <span aria-hidden="true" className="mr-1">
                    {s.emoji}
                  </span>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {formOpen && (
          <div className="card space-y-3 p-3 text-left">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Title</span>
              <input
                type="text"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                autoFocus
                aria-label="Reward title"
              />
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Cost</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-11 min-w-11 p-0"
                  aria-label="Fewer carrots"
                  onClick={() => setDraft((d) => ({ ...d, cost: Math.max(5, d.cost - 5) }))}
                >
                  −
                </button>
                <span className="hud-num w-20 text-center text-lg font-bold">{draft.cost} 🥕</span>
                <button
                  type="button"
                  className="btn-secondary min-h-11 min-w-11 p-0"
                  aria-label="More carrots"
                  onClick={() => setDraft((d) => ({ ...d, cost: d.cost + 5 }))}
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-right text-sm text-ink-muted" data-testid="cost-in-workouts">
              ≈ {workoutsFor(draft.cost)} {workoutsFor(draft.cost) === 1 ? 'workout' : 'workouts'}
            </p>
            <div className="flex gap-2" role="group" aria-label="Quick prices">
              {PRICE_PRESETS.map((preset) => (
                <button
                  key={preset.cost}
                  type="button"
                  className={`${draft.cost === preset.cost ? 'btn-primary' : 'btn-secondary'} min-h-11 flex-1 px-2 text-sm`}
                  aria-pressed={draft.cost === preset.cost}
                  onClick={() => setDraft((d) => ({ ...d, cost: preset.cost }))}
                >
                  {preset.label} {preset.cost}
                </button>
              ))}
            </div>
            {error && (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" disabled={!draft.title.trim()} onClick={saveDraft}>
                {editingId ? 'Save' : 'Add'}
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={cancelForm}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!formOpen && rewards.length > 0 && (
          <ul className="space-y-2">
            {rewards.map((reward) => (
              <li key={reward.id} className="card space-y-2 p-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    {reward.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {reward.title}
                      {!reward.active ? ' (hidden)' : ''}
                    </span>
                    <span className="block text-sm text-ink-muted">{reward.cost} 🥕</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary min-h-11 flex-1 px-3" onClick={() => startEdit(reward)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-11 flex-1 px-3"
                    onClick={() => onUpdate(reward.id, { active: !reward.active })}
                  >
                    {reward.active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger min-h-11 flex-1 px-3"
                    disabled={busyId === reward.id}
                    onClick={() => onRemove(reward.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn-ghost w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
