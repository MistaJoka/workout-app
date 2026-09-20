import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { createSettingCache } from './settingCache'

export type FeedbackSettings = { sound: boolean; vibration: boolean }

const DEFAULTS: FeedbackSettings = { sound: true, vibration: true }

// Shared across hook instances (Settings, the player): one read per page load.
const cache = createSettingCache<FeedbackSettings>(async () => {
  const [sound, vibration] = await Promise.all([getSetting<boolean>('sound'), getSetting<boolean>('vibration')])
  return { sound: sound ?? DEFAULTS.sound, vibration: vibration ?? DEFAULTS.vibration }
}, DEFAULTS)

export function useFeedbackSettings(): [FeedbackSettings, (patch: Partial<FeedbackSettings>) => void] {
  const [settings, setSettings] = useState<FeedbackSettings>(() => cache.peek())

  useEffect(() => {
    let cancelled = false
    void cache.resolve().then((resolved) => {
      if (!cancelled) setSettings(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function update(patch: Partial<FeedbackSettings>) {
    const next = { ...cache.peek(), ...patch }
    cache.set(next)
    setSettings(next)
    for (const [key, value] of Object.entries(patch)) void setSetting(key, value)
  }

  return [settings, update]
}
