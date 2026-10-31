// The settings table is key/value with free-form strings. Each key the app
// reads or writes in more than one place lives here once, with its value
// type and default, so a typo or a type drift can't hide. The key strings
// are existing user data: never rename one.
import { DEFAULT_GIVER_NAME, INITIAL_PIN_ATTEMPT_STATE, type PinAttemptState, type PinRecord } from '../domain/rewards/pin'
import { getSetting, setSetting } from './db/repositories/settingsRepository'

export type SettingDef<T> = { readonly key: string; readonly fallback: T }

function def<T>(key: string, fallback: T): SettingDef<T> {
  return { key, fallback }
}

export async function readSetting<T>(setting: SettingDef<T>): Promise<T> {
  return (await getSetting<T>(setting.key)) ?? setting.fallback
}

export function writeSetting<T>(setting: SettingDef<T>, value: T): Promise<void> {
  return setSetting(setting.key, value)
}

export const WEIGHT_UNIT = def<'kg' | 'lb'>('weightUnit', 'lb')
export const SOUND = def('sound', true)
export const VIBRATION = def('vibration', true)
export const MOTION = def<'full' | 'reduced' | 'off'>('motion', 'full')

// Hubby mode: the giver's name, salted PIN hash and guess-cooldown counter.
export const GIVER_NAME = def('rewardsGiverName', DEFAULT_GIVER_NAME)
export const HUBBY_PIN = def<PinRecord | null>('rewardsHubbyPin', null)
export const HUBBY_PIN_ATTEMPTS = def<PinAttemptState>('rewardsHubbyPinAttempts', INITIAL_PIN_ATTEMPT_STATE)

// The one reward she is saving for / the one he spotlights (reward ids).
export const SAVING_FOR = def<string | null>('rewardsSavingFor', null)
export const FEATURED_REWARD = def<string | null>('rewardsFeatured', null)
