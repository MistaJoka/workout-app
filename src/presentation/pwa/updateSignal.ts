// Tiny pub/sub between the service-worker registration (which learns a new
// build is ready) and the UpdateToast (which asks the user to reload).
// Pure so it can be unit-tested; late subscribers still get the signal.

type Listener = () => void

let ready = false
const listeners = new Set<Listener>()

export function notifyUpdateReady(): void {
  ready = true
  for (const listener of listeners) listener()
}

export function subscribeUpdateReady(listener: Listener): () => void {
  listeners.add(listener)
  if (ready) listener()
  return () => {
    listeners.delete(listener)
  }
}

export function resetUpdateSignalForTests(): void {
  ready = false
  listeners.clear()
}
