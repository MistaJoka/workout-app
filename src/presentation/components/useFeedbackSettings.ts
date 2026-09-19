import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

export type FeedbackSettings = { sound: boolean; vibration: boolean }

const DEFAULTS: FeedbackSettings = { sound: true, vibration: true }

export function useFeedbackSettings(): [FeedbackSettings, (patch: Partial<FeedbackSettings>) => void] {
  const [settings, setSettings] = useState<FeedbackSettings>(DEFAULTS)

  useEffect(() => {
    let cancelled = false
    Promise.all([getSetting<boolean>('sound'), getSetting<boolean>('vibration')]).then(([sound, vibration]) => {
      if (cancelled) return
      setSettings({ sound: sound ?? DEFAULTS.sound, vibration: vibration ?? DEFAULTS.vibration })
    })
    return () => {
      cancelled = true
    }
  }, [])

  function update(patch: Partial<FeedbackSettings>) {
    setSettings((s) => ({ ...s, ...patch }))
    for (const [key, value] of Object.entries(patch)) void setSetting(key, value)
  }

  return [settings, update]
}
