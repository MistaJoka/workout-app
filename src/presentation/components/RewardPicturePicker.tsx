import { RewardGlyph } from './RewardGlyph'
import { REWARD_ICONS } from '../../domain/rewards/rewardIcons'
import { pickEmoji, pickIcon, type IconDraft } from '../rewardDraft'

export const EMOJI_CHOICES = ['🥕', '🍓', '🍿', '🎬', '🛁', '💆', '🧹', '🍕', '☕', '🎮', '🌸', '💝']

// A reward's picture: the pixel icons first, then an "Other" emoji row for
// rewards no icon fits. Shared by the shop editor and the gift composer so
// both pick pictures the same way (pickIcon/pickEmoji).
export function RewardPicturePicker<D extends IconDraft>({ draft, onChange }: { draft: D; onChange: (update: (d: D) => D) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-semibold">Picture</span>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Reward icons">
        {REWARD_ICONS.map((icon) => (
          <button
            key={icon.id}
            type="button"
            aria-pressed={draft.icon === icon.id}
            aria-label={icon.name}
            className={`flex aspect-square items-center justify-center rounded-control border-2 ${
              draft.icon === icon.id ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
            }`}
            onClick={() => onChange((d) => pickIcon(d, icon) as D)}
          >
            <RewardGlyph emoji={icon.emoji} icon={icon.id} size={44} />
          </button>
        ))}
      </div>
      <span className="block pt-1 text-xs font-semibold text-ink-muted">Other</span>
      <div className="flex flex-wrap gap-2">
        {EMOJI_CHOICES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-pressed={!draft.icon && draft.emoji === emoji}
            aria-label={`Emoji ${emoji}`}
            className={`flex h-11 w-11 items-center justify-center rounded-control border-2 text-xl ${
              !draft.icon && draft.emoji === emoji ? 'border-primary bg-field-primary' : 'border-edge bg-surface'
            }`}
            onClick={() => onChange((d) => pickEmoji(d, emoji) as D)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
