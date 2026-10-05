import { REWARD_ICONS, type RewardIcon } from '../domain/rewards/rewardIcons'

// A reward or wish being written, as the editor holds it. `touched` marks a
// title or price typed by hand, which picking an icon never overwrites.
export type IconDraft = {
  title: string
  cost: number
  emoji: string
  icon?: string
  touched: { title: boolean; cost: boolean }
}

// One tap on an icon: it becomes the reward's picture, its emoji the text
// stand-in, and its name and price fill in whatever wasn't typed yet.
export function pickIcon(draft: IconDraft, icon: RewardIcon): IconDraft {
  return {
    ...draft,
    icon: icon.id,
    emoji: icon.emoji,
    title: draft.touched.title ? draft.title : icon.name,
    cost: draft.touched.cost ? draft.cost : icon.cost,
  }
}

// The "Other" emoji row, for rewards no icon fits: the emoji is the picture.
export function pickEmoji(draft: IconDraft, emoji: string): IconDraft {
  const { icon: _icon, ...rest } = draft
  return { ...rest, emoji }
}

export const STARTER_IDEAS: readonly RewardIcon[] = REWARD_ICONS.filter((i) => i.idea)
