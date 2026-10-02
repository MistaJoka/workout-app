import { activeProfile } from '../infrastructure/profiles'

// Which chapters of Rae's garden story this profile has opened, so Today's
// "new chapter" card and the story list's read state stay per person (two
// people can share a phone). A convenience only: a blocked or cleared store
// just means a chapter offers itself as unread again.
function key(): string {
  try {
    return `workout-app:story-seen:${activeProfile().id}`
  } catch {
    return 'workout-app:story-seen'
  }
}

export function readStorySeen(): readonly number[] {
  try {
    const raw = localStorage.getItem(key())
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

export function markChapterSeen(n: number): void {
  try {
    const seen = new Set(readStorySeen())
    seen.add(n)
    localStorage.setItem(key(), JSON.stringify([...seen].sort((a, b) => a - b)))
  } catch {
    // Storage blocked: the chapter just reads as unread again.
  }
}

export function isChapterSeen(n: number): boolean {
  return readStorySeen().includes(n)
}
