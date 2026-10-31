import { useCallback, useEffect, useState } from 'react'

// The load-on-mount pattern most screens hand-roll: undefined while
// loading, the value once it arrives, `failed` (never an endless skeleton)
// when it rejects, and `retry` for a Try again button. A result that
// arrives after the screen moved on (deps changed, unmounted) is dropped.
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setData(undefined)
    setFailed(false)
    load().then(
      (value) => {
        if (!cancelled) setData(value)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
    // `load` is a fresh closure each render; deps say when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { data, failed, retry }
}
