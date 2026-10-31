// Hubby mode's PIN, as one flow for the reward shop and the notes box:
// set it up (PIN + giver name + a clean guess counter, all or nothing) and
// check a guess against the stored hash and the guess cooldown. The pure
// rules live in domain/rewards/pin.ts; this only does the reads and writes.
import { db } from '../infrastructure/db/schema'
import { setSetting } from '../infrastructure/db/repositories/settingsRepository'
import { generateSalt, hasSubtleCrypto, sha256Hex } from '../infrastructure/pinCrypto'
import { GIVER_NAME, HUBBY_PIN, HUBBY_PIN_ATTEMPTS, readSetting } from '../infrastructure/settingsKeys'
import {
  createPinRecord,
  isInPinCooldown,
  recordCorrectPinAttempt,
  recordWrongPinAttempt,
  remainingCooldownMs,
  verifyPin,
} from '../domain/rewards/pin'

export type PinCheck = 'ok' | 'wrong' | 'cooldown'

// The three writes land together: a failure part-way never leaves a PIN
// without its name, or the old guess counter locking out the new PIN.
export async function setupPin(pin: string, giverName: string): Promise<void> {
  const algorithm = hasSubtleCrypto() ? 'sha256' : 'fallback'
  // Hashing is not a Dexie promise, so it finishes before the transaction opens.
  const record = await createPinRecord(pin, generateSalt(), sha256Hex, algorithm)
  await db.transaction('rw', db.settings, async () => {
    await setSetting(HUBBY_PIN.key, record)
    await setSetting(GIVER_NAME.key, giverName)
    await setSetting(HUBBY_PIN_ATTEMPTS.key, recordCorrectPinAttempt())
  })
}

export async function hasPin(): Promise<boolean> {
  return (await readSetting(HUBBY_PIN)) !== null
}

// `remainingMs` is the wait left once a guess is refused: a cooldown that
// was already running, or the one this wrong guess just started.
export async function checkPinDetailed(pin: string, now: Date = new Date()): Promise<{ result: PinCheck; remainingMs: number }> {
  const [record, attempts] = await Promise.all([readSetting(HUBBY_PIN), readSetting(HUBBY_PIN_ATTEMPTS)])
  if (!record) return { result: 'wrong', remainingMs: 0 }
  if (isInPinCooldown(attempts, now)) return { result: 'cooldown', remainingMs: remainingCooldownMs(attempts, now) }
  if (!(await verifyPin(pin, record, sha256Hex))) {
    const next = recordWrongPinAttempt(attempts, now)
    await setSetting(HUBBY_PIN_ATTEMPTS.key, next)
    return { result: 'wrong', remainingMs: remainingCooldownMs(next, now) }
  }
  await setSetting(HUBBY_PIN_ATTEMPTS.key, recordCorrectPinAttempt())
  return { result: 'ok', remainingMs: 0 }
}

export async function checkPin(pin: string, now: Date = new Date()): Promise<PinCheck> {
  return (await checkPinDetailed(pin, now)).result
}
