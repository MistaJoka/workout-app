// Pixel reward icons: the owner's ChatGPT pixel art (2026-10-04), one per
// kind of reward. Each has the reward's default name, the emoji that
// stands in for it in plain text (share messages, older app versions) and
// a suggested price in carrots. `idea` marks the one-tap starter ideas.
// Values are the owner-approved table in
// docs/superpowers/specs/2026-10-04-reward-icons-design.md. Pictures live
// in public/rewards/<id>.webp (sticker) and <id>-tile.webp (rounded tile),
// made by scripts/assets/reward-icons.py. Pure.

export type RewardIcon = { id: string; name: string; emoji: string; cost: number; idea: boolean }

export const REWARD_ICONS: readonly RewardIcon[] = [
  { id: 'nap-time', name: 'Nap time', emoji: '😴', cost: 20, idea: true },
  { id: 'sleep-in', name: 'Sleep in, no alarm', emoji: '⏰', cost: 30, idea: true },
  { id: 'no-dishes', name: 'No-dishes pass', emoji: '🍽️', cost: 20, idea: true },
  { id: 'laundry-done', name: 'Laundry done for you', emoji: '🧺', cost: 30, idea: true },
  { id: 'no-chores', name: 'No-chores day', emoji: '🛋️', cost: 60, idea: true },
  { id: 'tv-remote', name: 'Remote is yours tonight', emoji: '📺', cost: 20, idea: true },
  { id: 'movie-night', name: 'Movie night pick', emoji: '🍿', cost: 25, idea: true },
  { id: 'game-night', name: 'Game night', emoji: '🎮', cost: 30, idea: false },
  { id: 'love-letter', name: 'Love letter', emoji: '💌', cost: 20, idea: true },
  { id: 'reading-time', name: 'Cozy reading time', emoji: '📖', cost: 30, idea: false },
  { id: 'foot-rub', name: 'Foot rub', emoji: '💆', cost: 30, idea: true },
  { id: 'bubble-bath', name: 'Bubble bath', emoji: '🛁', cost: 40, idea: true },
  { id: 'spa-day', name: 'Spa day', emoji: '🧖', cost: 150, idea: true },
  { id: 'flowers', name: 'Flowers', emoji: '💐', cost: 50, idea: true },
  { id: 'coffee-date', name: 'Coffee date', emoji: '☕', cost: 40, idea: true },
  { id: 'breakfast-in-bed', name: 'Breakfast in bed', emoji: '🍳', cost: 60, idea: true },
  { id: 'dinner-date', name: 'Dinner date', emoji: '🥩', cost: 150, idea: true },
  { id: 'blanket-fort', name: 'Blanket fort night', emoji: '⛺', cost: 60, idea: true },
  { id: 'picnic', name: 'Picnic date', emoji: '🥪', cost: 100, idea: true },
  { id: 'sunset-drive', name: 'Sunset drive', emoji: '🌅', cost: 100, idea: true },
  { id: 'surprise-gift', name: 'Surprise gift', emoji: '🎁', cost: 80, idea: true },
  { id: 'takeout', name: 'Takeout night', emoji: '🥡', cost: 50, idea: false },
  { id: 'pizza', name: 'Pizza night', emoji: '🍕', cost: 40, idea: false },
  { id: 'sushi', name: 'Sushi night', emoji: '🍣', cost: 60, idea: false },
  { id: 'ramen', name: 'Ramen night', emoji: '🍜', cost: 40, idea: false },
  { id: 'tacos', name: 'Taco night', emoji: '🌮', cost: 40, idea: false },
  { id: 'burger', name: 'Burger and fries', emoji: '🍔', cost: 40, idea: false },
  { id: 'burrito', name: 'Burrito run', emoji: '🌯', cost: 40, idea: false },
  { id: 'burrito-bowl', name: 'Burrito bowl', emoji: '🥗', cost: 40, idea: false },
  { id: 'nachos', name: 'Nachos', emoji: '🧀', cost: 30, idea: false },
  { id: 'quesadilla', name: 'Quesadilla night', emoji: '🫓', cost: 40, idea: false },
  { id: 'donut', name: 'Donut treat', emoji: '🍩', cost: 20, idea: false },
  { id: 'sundae', name: 'Ice cream sundae', emoji: '🍨', cost: 20, idea: false },
  { id: 'boba', name: 'Boba run', emoji: '🧋', cost: 25, idea: false },
]

const BY_ID: ReadonlyMap<string, RewardIcon> = new Map(REWARD_ICONS.map((i) => [i.id, i]))

// Undefined for a missing id or one this app version doesn't know (a gift
// link from a newer app): callers fall back to the record's own emoji.
export function rewardIconById(id: string | undefined): RewardIcon | undefined {
  return id ? BY_ID.get(id) : undefined
}
