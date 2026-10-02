import { useEffect, useState } from 'react'

// Hubby mode: once he enters the right PIN, editing the shop, marking a
// coupon delivered and writing love notes don't re-ask for the rest of this
// visit to the rewards area (/rewards and /notes -- both PIN-gated by the
// same setting). In-memory only, module-level singleton so it survives the
// screen remount a route change between those two causes, and shared by
// both RewardsScreen and LoveNotesBoxScreen -- never written to IndexedDB
// or any other storage, so a reload always starts locked.

const IDLE_MS = 5 * 60 * 1000

type Listener = () => void

let unlocked = false
let idleTimer: ReturnType<typeof setTimeout> | null = null
let mountedAreaScreens = 0
let areaCheckTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener()
}

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function armIdleTimer(): void {
  clearIdleTimer()
  idleTimer = setTimeout(lockHubbySession, IDLE_MS)
}

export function isHubbyUnlocked(): boolean {
  return unlocked
}

// Call once a PIN guess has just been verified correct.
export function unlockHubbySession(): void {
  unlocked = true
  armIdleTimer()
  notify()
}

// Call whenever a hubby action actually happens (editing, marking
// delivered, writing a note) so the 5-minute idle clock restarts from that
// moment, not just from the original unlock.
export function touchHubbySession(): void {
  if (unlocked) armIdleTimer()
}

// The visible "Lock" control, and the idle timeout, both land here.
export function lockHubbySession(): void {
  unlocked = false
  clearIdleTimer()
  notify()
}

function subscribeHubbySession(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const AREA_PATHS = ['/rewards', '/notes']

// HashRouter: the route lives in the hash ("#/notes?x" -> "/notes").
export function isRewardsAreaPath(hash: string): boolean {
  const path = hash.replace(/^#/, '').split(/[?#]/)[0]
  return AREA_PATHS.includes(path)
}

// RewardsScreen and LoveNotesBoxScreen each call this on mount. Both are
// lazy routes, so going straight from one to the other can leave neither
// mounted while the next chunk loads (Suspense fallback). The deferred check
// therefore also asks where the URL is now: it locks only once no area
// screen is mounted AND the route has left /rewards and /notes -- a real
// departure from the rewards area.
function enterRewardsArea(): () => void {
  mountedAreaScreens += 1
  if (areaCheckTimer) {
    clearTimeout(areaCheckTimer)
    areaCheckTimer = null
  }
  return () => {
    mountedAreaScreens -= 1
    if (areaCheckTimer) clearTimeout(areaCheckTimer)
    areaCheckTimer = setTimeout(() => {
      if (mountedAreaScreens <= 0 && !isRewardsAreaPath(window.location.hash)) lockHubbySession()
    }, 0)
  }
}

// For tests only: a clean slate between specs.
export function resetHubbySessionForTests(): void {
  clearIdleTimer()
  if (areaCheckTimer) {
    clearTimeout(areaCheckTimer)
    areaCheckTimer = null
  }
  unlocked = false
  mountedAreaScreens = 0
  listeners.clear()
}

// Mounted by RewardsScreen/LoveNotesBoxScreen: registers this visit to the
// rewards area and reflects whether hubby mode is currently unlocked.
export function useHubbySession(): { unlocked: boolean; lock: () => void } {
  const [value, setValue] = useState(unlocked)
  useEffect(() => subscribeHubbySession(() => setValue(unlocked)), [])
  useEffect(() => enterRewardsArea(), [])
  return { unlocked: value, lock: lockHubbySession }
}

// The "Hubby mode on -- Lock" pill, shown on both screens while unlocked.
// Renders nothing while locked, so callers can place it unconditionally.
export function HubbyModePill({ unlocked: isUnlocked, onLock }: { unlocked: boolean; onLock: () => void }) {
  if (!isUnlocked) return null
  return (
    <div className="chip bg-field-notice gap-2 px-3" data-testid="hubby-mode-pill">
      <span className="font-semibold">Hubby mode on</span>
      <button type="button" className="underline" onClick={onLock}>
        Lock
      </button>
    </div>
  )
}
