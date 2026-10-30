import { Capacitor } from '@capacitor/core'

// Where links point, and whether we're running as the installed app.
//
// Links (a gift, a wish, a thank-you) always use the one public address
// her phone can reach: the self-hosted PWA over Tailscale Funnel (CLAUDE.md,
// Hosting). Made inside the APK (origin https://localhost), on the
// tailnet-only :8443 install or on the LAN, a link to the page's own origin
// would be dead on her phone, and another origin is a separate data store
// anyway. Only a real localhost page (dev, tests) links to itself.
// Override per build with VITE_PUBLIC_APP_URL.
export const PUBLIC_APP_URL: string =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? 'https://nomad.tailed9e33.ts.net:10000/'

export function linkLocationFor(input: {
  native: boolean
  origin: string
  baseUrl: string
  publicUrl: string
}): { origin: string; baseUrl: string } {
  if (!input.native && isLocalDev(input.origin)) return { origin: input.origin, baseUrl: input.baseUrl }
  const url = new URL(input.publicUrl)
  return { origin: url.origin, baseUrl: url.pathname || '/' }
}

function isLocalDev(origin: string): boolean {
  try {
    const host = new URL(origin).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

// Whether a link that opens in the browser lands in different storage from
// the installed app. True on iPhone/iPad (Safari and a home-screen app keep
// separate data). False on Android, where a Chrome tab and the installed
// PWA share the site's storage (and Chrome usually opens the app directly).
export function browserStorageIsSeparate(userAgent: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/.test(userAgent)
}

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

// The address to build share links from (domain/rewards/giftLink.ts).
export function giftLinkLocation(): { origin: string; baseUrl: string } {
  return linkLocationFor({
    native: isNativeApp(),
    origin: window.location.origin,
    baseUrl: import.meta.env.BASE_URL,
    publicUrl: PUBLIC_APP_URL,
  })
}

// True in the APK or a home-screen install; false in a plain browser tab,
// which keeps its own separate storage (on iPhone too: a home-screen app
// and Safari don't share data).
export function isInstalledApp(): boolean {
  if (isNativeApp()) return true
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    // matchMedia unavailable: fall through.
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}
