import { useEffect, useRef, useState } from 'react'
import { activeProfile, lastProfilePickDate, loadProfiles, markProfilePicked, setActiveProfile, type Profile } from '../../infrastructure/profiles'
import { getInProgressSessions } from '../../infrastructure/db/repositories/sessionRepository'
import { localDate, shouldShowProfilePick } from './profilePick'
import { RaeFace } from './Rae'

// Two people share this app. When there's more than one profile, the first
// open of the day asks who's working out, one big tap per person. It never
// covers a workout in progress (a session link, or an unfinished session in
// the current profile), and choosing the person already active just closes.
export function ProfilePickGate() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const firstCard = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const state = loadProfiles()
    const today = localDate(new Date())
    const ask = shouldShowProfilePick({
      profileCount: state.profiles.length,
      lastPickedDate: lastProfilePickDate(),
      today,
      hash: window.location.hash,
    })
    if (!ask) return
    let cancelled = false
    getInProgressSessions()
      .then((open) => open.length === 0)
      .catch(() => true)
      .then((show) => {
        if (cancelled) return
        if (show) setProfiles(state.profiles)
        // Mid-workout: the person is already decided for today.
        else markProfilePicked(today)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (profiles) firstCard.current?.focus()
  }, [profiles])

  if (!profiles) return null
  const activeId = activeProfile().id

  function choose(id: string) {
    if (id === activeId) {
      markProfilePicked(localDate(new Date()))
      setProfiles(null)
      return
    }
    setActiveProfile(id)
    location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-pick-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') choose(activeId)
      }}
    >
      <RaeFace expression="happy" size={96} />
      <h1 id="profile-pick-title" className="text-2xl font-bold">
        Who's working out?
      </h1>
      <ul className="w-full max-w-sm space-y-3">
        {profiles.map((profile, i) => (
          <li key={profile.id}>
            <button
              ref={i === 0 ? firstCard : undefined}
              type="button"
              className={`flex min-h-16 w-full items-center gap-4 rounded-panel p-4 text-left text-lg font-bold ${profile.id === activeId ? 'field-primary' : 'card'}`}
              onClick={() => choose(profile.id)}
            >
              <span
                aria-hidden="true"
                className={`flex h-12 w-12 flex-none items-center justify-center rounded-full text-xl font-extrabold ${profile.id === activeId ? 'bg-surface' : 'bg-field-info'}`}
              >
                {profile.name.charAt(0).toUpperCase()}
              </span>
              {profile.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
