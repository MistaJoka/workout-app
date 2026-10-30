import { useEffect, useState } from 'react'
import { isInstalledApp } from '../appContext'
import { promptInstall, subscribeInstall } from '../pwa/installPrompt'

// One tap to put the app on the home screen, shown only in a browser tab
// while Chrome is offering it (pwa/installPrompt.ts). Installed, it never
// shows. The owner's intro window will reuse promptInstall later.
export function InstallCard() {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeInstall(setAvailable), [])

  if (!available || isInstalledApp()) return null
  return (
    <section className="card flex items-center gap-3 p-3" aria-label="Install the app">
      <span aria-hidden="true" className="text-2xl">
        📲
      </span>
      <span className="min-w-0 flex-1 font-semibold">On your home screen</span>
      <button
        type="button"
        className="btn-primary min-h-11 flex-none px-4"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void promptInstall().finally(() => setBusy(false))
        }}
      >
        Install
      </button>
    </section>
  )
}
