import { newId } from '../shared/id'

// The SubtleCrypto seam domain/rewards/pin.ts's `Digest` parameter expects
// in production. SHA-256 where SubtleCrypto is available (every modern
// browser, and localhost/HTTPS -- the same secure-context requirement
// src/shared/id.ts already works around for crypto.randomUUID); a small
// deterministic fallback otherwise, so a PIN can still be set on a device
// without it (e.g. plain-HTTP LAN access). The PIN gate is a soft nuisance
// barrier against the other person on the same device
// (docs/SECURITY_AND_PRIVACY.md: "we do not protect against another person
// with access to an unlocked device"), never real authentication, so the
// fallback's weaker collision resistance is an acceptable trade for
// availability -- `hubbyPinAlgorithm` records which one actually ran, so a
// PinRecord never gets misread under the wrong algorithm later.

export function generateSalt(): string {
  return newId()
}

export function hasSubtleCrypto(): boolean {
  return typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle?.digest === 'function'
}

export async function sha256Hex(input: string): Promise<string> {
  if (hasSubtleCrypto()) {
    const bytes = new TextEncoder().encode(input)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return fallbackDigest(input)
}

// FNV-1a run twice (the second pass seeded with the first's output) for a
// longer, still-deterministic hex string. Not cryptographic -- just a
// fallback seam for environments with no SubtleCrypto at all.
function fallbackDigest(input: string): string {
  const once = (seed: number, s: string): number => {
    let hash = seed
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }
  const a = once(0x811c9dc5, input)
  const b = once(0x811c9dc5, `${input}:${a}`)
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}
