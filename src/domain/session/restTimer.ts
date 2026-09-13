export function remainingRestMs(restEndsAt: string, now: () => number = Date.now): number {
  return Math.max(0, new Date(restEndsAt).getTime() - now())
}

export function isRestComplete(restEndsAt: string, now: () => number = Date.now): boolean {
  return remainingRestMs(restEndsAt, now) <= 0
}
