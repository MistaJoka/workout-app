// Hubby mode: a 4-digit PIN gates editing the reward shop and marking
// coupons delivered (so the person spending carrots can't also grant
// herself rewards or fake a delivery). The PIN itself is never stored --
// only a salted hash -- and this module never touches SubtleCrypto/storage
// directly: `digest` is supplied by the caller (infrastructure/pinCrypto.ts
// in production, a trivial stub in tests), keeping this file pure and
// framework-independent per CLAUDE.md.

// The giver's name is customizable (Settings -> Hubby's reward shop); this
// is only the fallback shown before he's set his own.
export const DEFAULT_GIVER_NAME = 'Hubby Bunny'

// The short word for the giver's mode and labels ("Hubby mode", "Wifey
// mode"): the first word of the giver name. Either partner can run a shop
// on their own phone, so nothing here assumes who gives to whom.
export function giverRole(giverName: string | undefined): string {
  const first = (giverName ?? '').trim().split(/\s+/)[0] ?? ''
  if (!first) return DEFAULT_GIVER_NAME.split(' ')[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}

export type Digest = (input: string) => Promise<string>

export type PinRecord = {
  salt: string
  hash: string
  // Which digest produced `hash`, so a device that later gains/loses
  // SubtleCrypto doesn't misread a hash made under the other algorithm.
  algorithm: 'sha256' | 'fallback'
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

const PREFIX = 'fs-hubby-pin'

export async function hashPin(pin: string, salt: string, digest: Digest): Promise<string> {
  return digest(`${PREFIX}:${salt}:${pin}`)
}

export async function createPinRecord(
  pin: string,
  salt: string,
  digest: Digest,
  algorithm: PinRecord['algorithm']
): Promise<PinRecord> {
  return { salt, algorithm, hash: await hashPin(pin, salt, digest) }
}

// A non-4-digit guess never even reaches the digest -- that's a format
// error, not a wrong PIN, and the caller can tell them apart if it wants to.
export async function verifyPin(pin: string, record: PinRecord, digest: Digest): Promise<boolean> {
  if (!isValidPin(pin)) return false
  return (await hashPin(pin, record.salt, digest)) === record.hash
}

// Guess cooldown: a real person fat-fingering their own PIN gets a few free
// tries; a sustained guessing streak gets slower, not blocked forever. The
// state is small enough to persist verbatim in a settings row (the caller's
// job -- this module never touches storage) so a reload mid-cooldown can't
// reset the clock.
export const PIN_COOLDOWN_RULES = {
  // Wrong guesses allowed before the first cooldown kicks in.
  freeAttempts: 5,
  // The first cooldown's length; each wrong guess from here on doubles it
  // (30s, 60s, 120s, ...), so a determined streak slows to a crawl.
  baseCooldownMs: 30_000,
} as const

export type PinAttemptState = {
  // Consecutive wrong guesses since the last correct one (or ever, if none
  // has landed yet). A correct guess resets this to zero.
  failCount: number
  // When the current cooldown (if any) lets guessing resume again, or null
  // if there isn't one right now.
  cooldownUntil: string | null
}

export const INITIAL_PIN_ATTEMPT_STATE: PinAttemptState = { failCount: 0, cooldownUntil: null }

// How long a cooldown lasts for the guess that just made `failCount` wrong
// guesses in a row -- 0 while still within the free attempts.
export function cooldownMsFor(failCount: number): number {
  if (failCount <= PIN_COOLDOWN_RULES.freeAttempts) return 0
  const doublings = failCount - PIN_COOLDOWN_RULES.freeAttempts - 1
  return PIN_COOLDOWN_RULES.baseCooldownMs * 2 ** doublings
}

// Call after a guess the caller has already found to be wrong (a malformed
// guess isn't a real attempt and shouldn't be recorded here).
export function recordWrongPinAttempt(state: PinAttemptState, now: Date): PinAttemptState {
  const failCount = state.failCount + 1
  const ms = cooldownMsFor(failCount)
  return { failCount, cooldownUntil: ms > 0 ? new Date(now.getTime() + ms).toISOString() : null }
}

// Call after a correct guess: the slate is wiped clean.
export function recordCorrectPinAttempt(): PinAttemptState {
  return INITIAL_PIN_ATTEMPT_STATE
}

// Milliseconds left on the current cooldown, or 0 if none is active (either
// there never was one, or it has already elapsed).
export function remainingCooldownMs(state: PinAttemptState, now: Date): number {
  if (!state.cooldownUntil) return 0
  return Math.max(0, new Date(state.cooldownUntil).getTime() - now.getTime())
}

export function isInPinCooldown(state: PinAttemptState, now: Date): boolean {
  return remainingCooldownMs(state, now) > 0
}

// A gentle message for the cooldown window -- never scolding, just the wait.
export function pinCooldownMessage(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000))
  return `Take a breath -- try again in ${seconds}s.`
}
