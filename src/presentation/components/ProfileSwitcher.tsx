import { useState } from 'react'
import Dexie from 'dexie'
import {
  addProfile,
  deleteProfile,
  loadProfiles,
  renameProfile,
  setActiveProfile,
  type Profile,
} from '../../infrastructure/profiles'
import { GARDEN_SPECIES } from '../../domain/progress/garden'
import { PixelBloom } from './PixelBloom'

// A profile's emblem (Settings -> You -> Emblem), or null for the plain
// initial circle it replaces.
function emblemSpeciesFor(profile: Profile) {
  return profile.emblem ? GARDEN_SPECIES.find((s) => s.id === profile.emblem) ?? null : null
}

// Who's working out. A row at the top of Settings (each of you has your
// own phone, so switching is rare — it no longer sits in the corner of
// every screen); tapping it opens a sheet to switch, add, rename or remove
// a person. Switching reloads the
// app because every store is bound to the active profile's database.
export function ProfileSwitcher() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(() => loadProfiles())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState<Profile | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<Profile | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  // Derived from the state already in memory — no localStorage parse per render.
  const active = state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0]

  function refresh() {
    setState(loadProfiles())
  }

  function switchTo(id: string) {
    setActiveProfile(id)
    location.reload()
  }

  function handleAdd() {
    const profile = addProfile(draft)
    setDraft('')
    setAdding(false)
    refresh()
    switchTo(profile.id)
  }

  // Reads fresh profile state inside deleteProfile, so a stale sheet can't
  // delete the active person; the database goes first so a failure never
  // orphans it. Failures are local and say so.
  async function handleRemove(profile: Profile) {
    setRemoving(true)
    setRemoveError(null)
    try {
      const result = await deleteProfile(profile.id, { deleteDb: (name) => Dexie.delete(name) })
      if (result === 'blocked') {
        setRemoveError(`${profile.name}'s data is open in another window. Close it, then try again.`)
      } else if (result === 'refused') {
        setRemoveError(`${profile.name} can't be removed right now.`)
      } else {
        setConfirmRemove(null)
      }
    } catch {
      setRemoveError(`Couldn't remove ${profile.name}'s data on this device. Nothing was changed.`)
    } finally {
      setRemoving(false)
      refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Profile: ${active.name}. Switch person`}
        onClick={() => setOpen(true)}
        className="card flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-control bg-field-primary text-sm font-extrabold">
          {emblemSpeciesFor(active) ? (
            <PixelBloom size={28} animate={false} species={emblemSpeciesFor(active)!} />
          ) : (
            active.name.trim().charAt(0).toUpperCase() || '?'
          )}
        </span>
        <span className="flex-1 font-semibold">{active.name}</span>
        <span className="text-sm font-semibold text-primary-ink">Switch</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-[var(--radius-panel)] bg-surface p-4 pb-8 space-y-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Who's working out?"
          >
            <p className="text-lg font-bold">Who's working out?</p>

            <ul className="space-y-2">
              {state.profiles.map((profile) => {
                const isActive = profile.id === state.activeId
                return (
                  <li key={profile.id} className={`flex items-center gap-2 p-3 ${isActive ? 'field-primary' : 'card'}`}>
                    {renaming?.id === profile.id ? (
                      <form
                        className="flex flex-1 gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          renameProfile(profile.id, draft)
                          setRenaming(null)
                          setDraft('')
                          refresh()
                        }}
                      >
                        <input className="input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
                        <button type="submit" className="btn-primary btn-sm">
                          Save
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-3 text-left font-bold"
                          onClick={() => (isActive ? setOpen(false) : switchTo(profile.id))}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface font-extrabold">
                            {emblemSpeciesFor(profile) ? (
                              <PixelBloom size={26} animate={false} species={emblemSpeciesFor(profile)!} />
                            ) : (
                              profile.name.charAt(0).toUpperCase()
                            )}
                          </span>
                          {profile.name}
                          {isActive && <span className="text-xs font-semibold text-ink-muted">(you)</span>}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setRenaming(profile)
                            setDraft(profile.name)
                          }}
                        >
                          Rename
                        </button>
                        {!isActive && state.profiles.length > 1 && (
                          confirmRemove?.id === profile.id ? (
                            <button
                              type="button"
                              className="btn-danger btn-sm"
                              disabled={removing}
                              onClick={() => void handleRemove(profile)}
                            >
                              {removing ? 'Removing…' : 'Delete all their data'}
                            </button>
                          ) : (
                            <button type="button" className="btn-ghost" onClick={() => setConfirmRemove(profile)}>
                              Remove
                            </button>
                          )
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
            {removeError && (
              <p className="text-sm font-semibold" role="alert">
                {removeError}
              </p>
            )}

            {adding ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAdd()
                }}
              >
                <input
                  className="input"
                  autoFocus
                  placeholder="Their name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={!draft.trim()}>
                  Add
                </button>
              </form>
            ) : (
              <button type="button" className="btn-secondary w-full" onClick={() => setAdding(true)}>
                + Add a person
              </button>
            )}
            <p className="text-xs text-ink-muted">Each person has their own routines, history and settings on this device.</p>
          </div>
        </div>
      )}
    </>
  )
}
