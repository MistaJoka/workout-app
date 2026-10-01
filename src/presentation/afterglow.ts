// Today's "afterglow": whether Rae's room should stay warm and celebratory
// because a workout was finished today. Derived purely from the same
// `flowers` RaeHero already receives (buildGarden's output, oldest first -
// see garden.ts and raeRoom.ts's `newestFlowers`), never from a separate
// "did today's session happen" lookup, so there is exactly one source of
// truth for "a workout grew a flower today".
//
// Kept pure and framework-free (plain vitest target); RaeHero.tsx wires it
// to the real clock.

import type { GardenFlower } from '../domain/progress/garden'

// Same local-day comparison as todayView.ts's dayKey: calendar fields, not
// a 24h window, so a workout finished at 11pm and a check at 7am the next
// day are correctly different days regardless of timezone.
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// True once the newest flower (if any) ended today in local time. An empty
// garden, or a newest flower with an unparseable `endedAt`, is never an
// afterglow day.
export function isAfterglowDay(flowers: readonly GardenFlower[], now: Date): boolean {
  if (flowers.length === 0) return false
  const newest = flowers[flowers.length - 1]
  const endedAt = new Date(newest.endedAt)
  if (Number.isNaN(endedAt.getTime())) return false
  return dayKey(endedAt) === dayKey(now)
}
