import { localDay } from '../../infrastructure/profiles'

export const localDate = localDay

// "Who's working out?" asks when two or more people share this device, at
// most once per calendar day, and never over a workout opened by a session
// link (someone is mid-set; the person is already decided).
export function shouldShowProfilePick({
  profileCount,
  lastPickedDate,
  today,
  hash,
}: {
  profileCount: number
  lastPickedDate: string | null
  today: string
  hash: string
}): boolean {
  if (profileCount < 2) return false
  if (lastPickedDate === today) return false
  if (hash.startsWith('#/session/')) return false
  return true
}
