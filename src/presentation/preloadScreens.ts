// The secondary screens are lazy chunks (App.tsx), so the first visit to
// each one flashed a loading placeholder (~320 ms at phone speed, measured
// in the 2026-10-29 audit; repeat visits 8-22 ms). Once the app has settled,
// fetch those chunks one at a time in idle moments, so the first visit is
// as quick as the second. The same import() paths as App.tsx, so they are
// the very same chunks. Never during a workout, never on Data Saver.
const SCREENS: (() => Promise<unknown>)[] = [
  () => import('./screens/ScheduleScreen'),
  () => import('./screens/ExerciseDetailScreen'),
  () => import('./screens/RoutineDetailScreen'),
  () => import('./screens/RoutineBuilderScreen'),
  () => import('./screens/SessionDetailScreen'),
  () => import('./screens/ExerciseHistoryScreen'),
  () => import('./screens/GardenScreen'),
  () => import('./screens/AchievementsScreen'),
  () => import('./screens/RewardsScreen'),
  () => import('./screens/LoveNotesBoxScreen'),
  () => import('./screens/RecapScreen'),
  () => import('./screens/StoryScreen'),
  () => import('./screens/StoryChapterScreen'),
  () => import('./screens/BossScreen'),
  () => import('./screens/SurpriseScreen'),
  () => import('./screens/AboutScreen'),
  () => import('./screens/MeetRaeScreen'),
]

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }

export function shouldPreload(hash: string, saveData: boolean): boolean {
  return !saveData && !hash.startsWith('#/session/')
}

export function preloadScreens(win: IdleWindow = window): void {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  const idle = (cb: () => void) =>
    win.requestIdleCallback ? win.requestIdleCallback(cb, { timeout: 4000 }) : win.setTimeout(cb, 500)
  const queue = [...SCREENS]
  const next = () => {
    const load = queue.shift()
    if (!load) return
    // Mid-workout, try again later rather than compete with the player.
    if (!shouldPreload(win.location.hash, saveData)) {
      if (saveData) return
      queue.unshift(load)
      win.setTimeout(() => idle(next), 30_000)
      return
    }
    load()
      .catch(() => undefined) // offline before caching: the route loads on demand later
      .finally(() => idle(next))
  }
  // Start after the first screen is up and the browser is quiet.
  const begin = () => win.setTimeout(() => idle(next), 1500)
  if (document.readyState === 'complete') begin()
  else win.addEventListener('load', begin, { once: true })
}
