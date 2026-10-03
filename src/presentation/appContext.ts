import { Capacitor } from '@capacitor/core'

// Where links point, and whether we're running as the installed app.
//
// Inside the APK the page's own origin is Capacitor's internal
// https://localhost, so a link made there (a wish, a thank-you) would be
// dead on the other phone. Links always use the public web app's address.
// Override per build with VITE_PUBLIC_APP_URL.
export const PUBLIC_APP_URL: string =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? 'https://nomad.tailed9e33.ts.net:8443/'

export function linkLocationFor(input: {
  native: boolean
  origin: string
  baseUrl: string
  publicUrl: string
}): { origin: string; baseUrl: string } {
  if (!input.native) return { origin: input.origin, baseUrl: input.baseUrl }
  const url = new URL(input.publicUrl)
  return { origin: url.origin, baseUrl: url.pathname || '/' }
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
