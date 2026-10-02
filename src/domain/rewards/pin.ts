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
