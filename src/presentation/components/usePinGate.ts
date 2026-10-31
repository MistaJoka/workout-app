import { useState } from 'react'
import { checkPinDetailed, setupPin } from '../../application/hubbyPin'
import { pinCooldownMessage } from '../../domain/rewards/pin'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { unlockHubbySession } from './hubbySession'

// The PIN sheets' shared flow for RewardsScreen and LoveNotesBoxScreen: busy
// and error state, the wording of each failure, and unlocking Hubby mode on
// success. Where to land afterwards stays with the screen: `submit` and
// `setup` resolve true once the PIN is good and the session is unlocked.
export function usePinGate() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setup(pin: string, giverName: string): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await setupPin(pin, giverName)
      unlockHubbySession()
      return true
    } catch (err) {
      setError(storageErrorMessage(err, 'save'))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submit(pin: string): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      const { result, remainingMs } = await checkPinDetailed(pin)
      if (result === 'ok') {
        unlockHubbySession()
        return true
      }
      setError(remainingMs > 0 ? pinCooldownMessage(remainingMs) : 'Wrong PIN.')
      return false
    } catch {
      setError("Couldn't check that on this device. Try again.")
      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, setError, clearError: () => setError(null), setup, submit }
}
