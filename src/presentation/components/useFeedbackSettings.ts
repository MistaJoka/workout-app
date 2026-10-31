import { useEffect, useState } from 'react'
import { readSetting, SOUND, VIBRATION, writeSetting } from '../../infrastructure/settingsKeys'
import { createSettingCache } from './settingCache'

export type FeedbackSettings = { sound: boolean; vibration: boolean }

const DEFAULTS: FeedbackSettings = { sound: true, vibration: true }

// Shared across hook instances (Settings, the player): one read per page load.
const cache = createSettingCache<FeedbackSettings>(async () => {
  const [sound, vibration] = await Promise.all([readSetting(SOUND), readSetting(VIBRATION)])
  return { sound, vibration }
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
    if (patch.sound !== undefined) writeSetting(SOUND, patch.sound).catch(() => undefined)
    if (patch.vibration !== undefined) writeSetting(VIBRATION, patch.vibration).catch(() => undefined)
  }

  return [settings, update]
}
