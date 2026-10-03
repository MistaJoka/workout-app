import { App as CapacitorApp } from '@capacitor/app'
import { isNativeApp } from '../appContext'

// Android: tapping a link to the web app (a gift, wish or thank-you) can
// open the APK instead of the browser (intent filter in AndroidManifest.xml;
// she turns on Settings > Apps > Foundation Strength > Open by default once,
// since the tailnet domain can't be auto-verified). The link's hash is a
// HashRouter route, so routing it is just setting the hash.

export function hashRouteFromUrl(url: string): string | null {
  try {
    const hash = new URL(url).hash
    return hash.startsWith('#/') ? hash : null
  } catch {
    return null
  }
}

function open(url: string): void {
  const route = hashRouteFromUrl(url)
  if (route) window.location.hash = route
}

export async function listenForAppLinks(): Promise<void> {
  if (!isNativeApp()) return
  try {
    await CapacitorApp.addListener('appUrlOpen', (event) => open(event.url))
    // Cold start from a link: the app wasn't running to hear the event.
    const launch = await CapacitorApp.getLaunchUrl()
    if (launch?.url) open(launch.url)
  } catch {
    // Plugin unavailable: links still paste into the shop.
  }
}
