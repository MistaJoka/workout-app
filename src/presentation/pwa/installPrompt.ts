// Chrome's install offer, kept for an Install button of our own. Chrome
// fires `beforeinstallprompt` once it considers the app installable; if
// that event isn't held, the only way in later is ⋮ → Install app. Holding
// it lets Settings (and the owner's intro window later) offer one tap.
// Pure pub/sub like updateSignal.ts, so it can be unit-tested.

type InstallEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type Listener = (canInstall: boolean) => void

let held: InstallEvent | null = null
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener(held !== null)
}

export function listenForInstallPrompt(target: Pick<Window, 'addEventListener'> = window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    // Keep Chrome's own mini-infobar from racing ours; we show the offer.
    event.preventDefault()
    held = event as InstallEvent
    emit()
  })
  target.addEventListener('appinstalled', () => {
    held = null
    emit()
  })
}

export function canInstall(): boolean {
  return held !== null
}

export function subscribeInstall(listener: Listener): () => void {
  listeners.add(listener)
  listener(held !== null)
  return () => {
    listeners.delete(listener)
  }
}

// Shows Chrome's install sheet. The event works once, so it's dropped
// whatever she answers; Chrome fires a fresh one if she can still install.
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = held
  if (!event) return 'unavailable'
  held = null
  emit()
  try {
    await event.prompt()
    return (await event.userChoice).outcome
  } catch {
    return 'dismissed'
  }
}

export function resetInstallPromptForTests(): void {
  held = null
  listeners.clear()
}
