import { useRef, useState } from 'react'
import { useTheme } from '../theme/ThemeContext'
import { exportAll, importAll, isValidExportBundle } from '../../infrastructure/exportImport/exportImport'

export function SettingsScreen() {
  const { theme, setTheme, motion, setMotion } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handleExport() {
    const bundle = await exportAll()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workout-app-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Export downloaded.')
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      if (!isValidExportBundle(bundle)) {
        setStatus('Import failed — this file is not a valid backup.')
        return
      }
      await importAll(bundle)
      setStatus('Import complete.')
    } catch {
      setStatus('Import failed — check the file and try again.')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-2">
        <p className="font-semibold">Theme</p>
        <div className="flex gap-2">
          <ThemeButton label="Pixel Bloom" active={theme === 'pixel-bloom'} onClick={() => setTheme('pixel-bloom')} />
          <ThemeButton label="Savage Core" active={theme === 'savage-core'} onClick={() => setTheme('savage-core')} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Motion</p>
        <div className="flex gap-2">
          {(['full', 'reduced', 'off'] as const).map((option) => (
            <ThemeButton key={option} label={option} active={motion === option} onClick={() => setMotion(option)} capitalize />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Backup</p>
        <div className="flex gap-2">
          <button className="rounded-panel border border-edge px-4 py-2" onClick={handleExport}>
            Export data
          </button>
          <button className="rounded-panel border border-edge px-4 py-2" onClick={() => fileInputRef.current?.click()}>
            Import data
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleImportFile(file)
          }}
        />
        {status && <p className="text-sm text-ink-muted">{status}</p>}
      </section>
    </div>
  )
}

function ThemeButton({
  label,
  active,
  onClick,
  capitalize,
}: {
  label: string
  active: boolean
  onClick: () => void
  capitalize?: boolean
}) {
  return (
    <button
      className={`rounded-panel border px-3 py-2 ${capitalize ? 'capitalize' : ''} ${
        active ? 'border-primary text-primary' : 'border-edge'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
