// Rae's room on Today grows with the user's Bloom level (xp.ts): a handful
// of small decorations unlock, in order, and simply stay forever (earned by
// effort, never lost - the ethics rule every unlock in this app follows).
//
// Pure and framework-free so it's a plain vitest target; RaeHero.tsx wires
// it to the real level and localStorage (which unlocks have already been
// shown, so a newly-unlocked item only twinkles in once).

export type RoomUnlockItem =
  | 'wallFrame'
  | 'cushion'
  | 'bookshelf'
  | 'lightsUpgrade'
  | 'rugPattern'
  | 'hangingPlant'
  | 'windowSeat'

export type RoomUnlock = {
  item: RoomUnlockItem
  level: number
  // Shown on Progress ("Next unlock: Bookshelf at level 5").
  label: string
}

// Ordered by level - every caller can rely on this already being sorted.
export const ROOM_UNLOCKS: readonly RoomUnlock[] = [
  { item: 'wallFrame', level: 2, label: 'Flower painting' },
  { item: 'cushion', level: 3, label: 'Cozy cushion' },
  { item: 'bookshelf', level: 5, label: 'Bookshelf' },
  { item: 'lightsUpgrade', level: 7, label: 'Warmer lights' },
  { item: 'rugPattern', level: 9, label: 'Fancier rug' },
  { item: 'hangingPlant', level: 12, label: 'Hanging plant' },
  { item: 'windowSeat', level: 15, label: 'Window seat' },
]

// Every item unlocked at or before `level`, in unlock order.
export function unlockedRoomItems(level: number): readonly RoomUnlockItem[] {
  return ROOM_UNLOCKS.filter((u) => level >= u.level).map((u) => u.item)
}

// The next thing still to unlock, or null once everything above is earned.
export function nextRoomUnlock(level: number): { item: RoomUnlockItem; level: number } | null {
  const next = ROOM_UNLOCKS.find((u) => level < u.level)
  return next ? { item: next.item, level: next.level } : null
}

export function labelFor(item: RoomUnlockItem): string {
  return ROOM_UNLOCKS.find((u) => u.item === item)?.label ?? item
}

const SEEN_KEY = 'workout-app:rae-room-unlocks-seen'

export function roomUnlocksSeenKey(): string {
  return SEEN_KEY
}

// The most recently-unlocked item at `level` (the one closest below it),
// or null before the first unlock - this is the one that twinkles in,
// mirroring how only the newest garden pot bounces (raeRoom.ts).
export function newestUnlock(level: number): RoomUnlock | null {
  const unlocked = ROOM_UNLOCKS.filter((u) => level >= u.level)
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null
}

// True the first time Today opens after the room earned a decoration nobody
// has been shown yet (a null newest, nothing unlocked, never reveals) -
// same shape as raeRoom.ts's shouldRevealNewestFlower.
export function shouldRevealNewestUnlock(lastSeenLevel: number | null, newestLevel: number | null): boolean {
  return newestLevel != null && newestLevel !== lastSeenLevel
}

// Dev-only QA escape hatch (no UI), the same shape as season.ts's
// `?season=` override: forces the room's level without finishing real
// workouts, for screenshots and e2e. An explicit `?level=` always wins;
// anything missing/non-numeric/below 1 is ignored so a stray or malformed
// query string never blanks the room.
export const LEVEL_QUERY_PARAM = 'level'

function levelFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get(LEVEL_QUERY_PARAM)
  if (raw == null) return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : null
}

// The level the room actually shows: the `?level=` override if present and
// valid, else the real level passed in.
export function resolveRoomLevel(level: number, search = ''): number {
  return levelFromSearch(search) ?? level
}
