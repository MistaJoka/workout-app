import { useState } from 'react'
import Dexie from 'dexie'
import {
  activeProfile,
  addProfile,
  dbNameFor,
  loadProfiles,
  removeProfile,
  renameProfile,
  setActiveProfile,
  type Profile,
} from '../../infrastructure/profiles'

// Who's working out. A small initial in the top corner; tapping it opens a
// sheet to switch, add, rename or remove a person. Switching reloads the
// app because every store is bound to the active profile's database.
export function ProfileSwitcher() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(() => loadProfiles())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState<Profile | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<Profile | null>(null)
  const active = activeProfile()

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

  async function handleRemove(profile: Profile) {
    removeProfile(profile.id)
    await Dexie.delete(dbNameFor(profile.id))
    setConfirmRemove(null)
    refresh()
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Profile: ${active.name}. Switch person`}
        onClick={() => setOpen(true)}
        className="fixed right-4 z-20 flex h-10 w-10 items-center justify-center rounded-control bg-field-primary text-sm font-extrabold text-ink"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        {active.name.trim().charAt(0).toUpperCase() || '?'}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => setOpen(false)}>
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
                            {profile.name.charAt(0).toUpperCase()}
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
                            <button type="button" className="btn btn-sm bg-accent text-white" onClick={() => handleRemove(profile)}>
                              Delete all their data
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
