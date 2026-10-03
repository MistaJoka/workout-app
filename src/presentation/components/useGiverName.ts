import { useEffect, useState } from 'react'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { DEFAULT_GIVER_NAME } from '../../domain/rewards/pin'

// Whoever runs this phone's shop ("Hubby Bunny" by default; "Wifey Bunny"
// when she runs one on his phone). Set during shop setup.
export const GIVER_NAME_KEY = 'rewardsGiverName'

export function useGiverName(): string {
  const [name, setName] = useState(DEFAULT_GIVER_NAME)
  useEffect(() => {
    let cancelled = false
    getSetting<string>(GIVER_NAME_KEY)
      .then((stored) => {
        if (!cancelled && stored) setName(stored)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return name
}
