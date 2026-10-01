import { activeProfile } from '../infrastructure/profiles'

// Which week's recap this profile last opened, so Today offers each week
// once. Per profile (two people can share a phone); a convenience only, so
// a blocked or cleared store just means the offer shows again.
function key(): string {
  try {
    return `workout-app:recap-seen:${activeProfile().id}`
  } catch {
    return 'workout-app:recap-seen'
  }
}

export function readRecapSeen(): string | null {
  try {
    return localStorage.getItem(key())
  } catch {
    return null
  }
}

export function markRecapSeen(weekStart: string): void {
  try {
    localStorage.setItem(key(), weekStart)
  } catch {
    // Storage blocked: the offer simply shows again.
  }
}
