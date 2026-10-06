import { useEffect, useState } from 'react'
import { isHearted, setHeart } from '../../infrastructure/db/repositories/favoritesRepository'

// One tap hearts a move for Her mix; a second tap un-hearts it. Full
// motion pops the heart (index.css); reduced/off just swaps the glyph.
export function HeartButton({ exerciseId, name }: { exerciseId: string; name: string }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [popKey, setPopKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    isHearted(exerciseId)
      .then((v) => {
        if (!cancelled) setOn(v)
      })
      .catch(() => {
        if (!cancelled) setOn(false)
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId])
  async function toggle() {
    const next = !on
    setOn(next)
    if (next) setPopKey((k) => k + 1)
    try {
      await setHeart(exerciseId, next)
    } catch {
      setOn(!next)
    }
  }
  return (
    <button
      type="button"
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-2xl active:bg-field-primary"
      aria-pressed={on === true}
      aria-label={on ? `Un-heart ${name}` : `Heart ${name}`}
      disabled={on === null}
      onClick={() => void toggle()}
    >
      <span key={popKey} aria-hidden="true" className={on ? 'heart-pop text-primary' : 'text-ink-muted'}>
        {on ? '♥' : '♡'}
      </span>
    </button>
  )
}
