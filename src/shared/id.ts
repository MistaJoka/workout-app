// Random ids for events, plans and routines. crypto.randomUUID only exists
// in secure contexts (HTTPS or localhost), so the plain-HTTP LAN URL has no
// randomUUID and calling it there throws. getRandomValues works everywhere;
// Math.random is the last resort for environments with no crypto at all.

type CryptoLike = { randomUUID?: () => string; getRandomValues?: <T extends ArrayBufferView>(array: T) => T }

function defaultCrypto(): CryptoLike | null {
  return typeof crypto !== 'undefined' ? (crypto as CryptoLike) : null
}

export function newId(source: CryptoLike | null = defaultCrypto()): string {
  if (source?.randomUUID) {
    try {
      return source.randomUUID()
    } catch {
      // Some browsers expose randomUUID but throw outside a secure context.
    }
  }
  const bytes = new Uint8Array(16)
  if (source?.getRandomValues) {
    source.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
