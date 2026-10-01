import { activeProfile } from '../infrastructure/profiles'

// Which week's (and separately, which month's) recap this profile last
// opened, so Today offers each one once. Per profile (two people can share
// a phone); a convenience only, so a blocked or cleared store just means
// the offer shows again.
function key(): string {
  try {
    return `workout-app:recap-seen:${activeProfile().id}`
  } catch {
    return 'workout-app:recap-seen'
  }
}

function monthSeenKey(): string {
  try {
    return `workout-app:recap-seen-month:${activeProfile().id}`
  } catch {
    return 'workout-app:recap-seen-month'
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

export function readRecapSeenMonth(): string | null {
  try {
    return localStorage.getItem(monthSeenKey())
  } catch {
    return null
  }
}

export function markRecapSeenMonth(monthKey: string): void {
  try {
    localStorage.setItem(monthSeenKey(), monthKey)
  } catch {
    // Storage blocked: the offer simply shows again.
  }
}
