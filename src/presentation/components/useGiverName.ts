import { useEffect, useState } from 'react'
import { GIVER_NAME, readSetting } from '../../infrastructure/settingsKeys'
import { DEFAULT_GIVER_NAME } from '../../domain/rewards/pin'

// Whoever runs this phone's shop ("Hubby Bunny" by default; "Wifey Bunny"
// when she runs one on his phone). Set during shop setup.
export function useGiverName(): string {
  const [name, setName] = useState(DEFAULT_GIVER_NAME)
  useEffect(() => {
    let cancelled = false
    readSetting(GIVER_NAME)
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
