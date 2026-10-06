import { RewardGlyph } from './RewardGlyph'
import { carrots } from '../units'
import { EMOJI_CHOICES, RewardPicturePicker } from './RewardPicturePicker'
import { STARTER_IDEAS, type IconDraft } from '../rewardDraft'
import { rewardTier, weeklyForecast, workoutsFor } from '../../domain/rewards/pricing'
import { useRef, useState } from 'react'
import { useSheetFocus } from './useSheetFocus'
import type { RewardRecord } from '../../infrastructure/db/schema'

// Hubby Bunny's editor, PIN-gated by the caller (RewardsScreen only renders
// this once the PIN has been verified for this visit). Add/edit/remove the
// shop's catalog. One tap on a pixel icon (domain/rewards/rewardIcons.ts)
// picks the picture and fills in its name and price; a small emoji row
// covers anything no icon fits. Cute starter ideas are offered only while
// the shop is empty, one tap to add -- never pre-created.


export type RewardDraft = { title: string; cost: number; emoji: string; icon?: string }

const UNTOUCHED = { title: false, cost: false }

function toReward({ title, cost, emoji, icon }: IconDraft): RewardDraft {
  return { title, cost, emoji, ...(icon ? { icon } : {}) }
}

// One tap to a sensible price per tier (domain/rewards/pricing.ts limits).
const PRICE_PRESETS = [
  { label: 'Little', cost: 25 },
  { label: 'Bigger', cost: 60 },
  { label: 'Big', cost: 150 },
  { label: 'Mega', cost: 1000 },
] as const

export function RewardEditorSheet({
  rewards,
  giverName,
  weeklyGoal = 2,
  busyId,
  error,
  onAdd,
  onUpdate,
  onRemove,
  featuredId,
  onToggleFeatured,
  onClose,
}: {
  rewards: RewardRecord[]
  giverName: string
  // Her weekly goal: a mega price is also told in weeks at this pace.
  weeklyGoal?: number
  busyId: string | null
  error: string | null
  onAdd: (input: RewardDraft) => void
  onUpdate: (id: string, patch: Partial<Pick<RewardRecord, 'title' | 'cost' | 'emoji' | 'icon' | 'active'>>) => void
  onRemove: (id: string) => void
  // One reward he spotlights at the top of the shop. No countdown, no
  // "leaving soon": every reward stays buyable either way.
  featuredId: string | null
  onToggleFeatured: (id: string) => void
  onClose: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<IconDraft>({ title: '', cost: 25, emoji: EMOJI_CHOICES[0], touched: UNTOUCHED })

  function startAdd() {
    setDraft({ title: '', cost: 25, emoji: EMOJI_CHOICES[0], touched: UNTOUCHED })
    setAdding(true)
    setEditingId(null)
  }

  function startEdit(reward: RewardRecord) {
    // An existing reward's name and price count as chosen: picking an icon
    // for it changes only its picture.
    setDraft({ title: reward.title, cost: reward.cost, emoji: reward.emoji, ...(reward.icon ? { icon: reward.icon } : {}), touched: { title: true, cost: true } })
    setEditingId(reward.id)
    setAdding(false)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
  }

  function saveDraft() {
    if (!draft.title.trim()) return
    if (editingId) onUpdate(editingId, { ...toReward(draft), icon: draft.icon })
    else onAdd(toReward(draft))
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
        <p className="text-sm text-ink-muted">Add, edit or remove what carrots can buy.</p>

        {!formOpen && (
          <button type="button" className="btn-primary w-full" onClick={() => startAdd()}>
            + Add a reward
          </button>
        )}

        {!formOpen && rewards.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Cute starter ideas, one tap to add:</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_IDEAS.map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  className="chip gap-1.5"
                  onClick={() => onAdd({ title: idea.name, cost: idea.cost, emoji: idea.emoji, icon: idea.id })}
                >
                  <RewardGlyph emoji={idea.emoji} icon={idea.id} size={24} />
                  {idea.name}
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
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, touched: { ...d.touched, title: true } }))}
                autoFocus
                aria-label="Reward title"
              />
            </label>
            <RewardPicturePicker draft={draft} onChange={setDraft} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Cost</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-11 min-w-11 p-0"
                  aria-label="Fewer carrots"
                  onClick={() => setDraft((d) => ({ ...d, cost: Math.max(5, d.cost - 5), touched: { ...d.touched, cost: true } }))}
                >
                  −
                </button>
                <span className="hud-num w-20 text-center text-lg font-bold">{carrots(draft.cost)} 🥕</span>
                <button
                  type="button"
                  className="btn-secondary min-h-11 min-w-11 p-0"
                  aria-label="More carrots"
                  onClick={() => setDraft((d) => ({ ...d, cost: d.cost + 5, touched: { ...d.touched, cost: true } }))}
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-right text-sm text-ink-muted" data-testid="cost-in-workouts">
              ≈ {workoutsFor(draft.cost)} {workoutsFor(draft.cost) === 1 ? 'workout' : 'workouts'}
              {/* The same forecast her Schedule shows (workouts plus the weekly-goal
                  bonus), so the two never disagree. */}
              {rewardTier(draft.cost) === 'mega' && `, about ${weeklyForecast(weeklyGoal, draft.cost).weeks} weeks at ${weeklyGoal} a week`}
            </p>
            <div className="flex gap-2" role="group" aria-label="Quick prices">
              {PRICE_PRESETS.map((preset) => (
                <button
                  key={preset.cost}
                  type="button"
                  className={`${draft.cost === preset.cost ? 'btn-primary' : 'btn-secondary'} min-h-11 flex-1 px-2 text-sm`}
                  aria-pressed={draft.cost === preset.cost}
                  onClick={() => setDraft((d) => ({ ...d, cost: preset.cost, touched: { ...d.touched, cost: true } }))}
                >
                  {preset.label} {carrots(preset.cost)}
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
                  <RewardGlyph emoji={reward.emoji} icon={reward.icon} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {reward.title}
                      {!reward.active ? ' (hidden)' : ''}
                    </span>
                    <span className="block text-sm text-ink-muted">{carrots(reward.cost)} 🥕</span>
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
                    className={`${featuredId === reward.id ? 'btn-primary' : 'btn-secondary'} min-h-11 flex-1 px-3`}
                    aria-pressed={featuredId === reward.id}
                    aria-label={`Feature ${reward.title}`}
                    onClick={() => onToggleFeatured(reward.id)}
                  >
                    ⭐
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
