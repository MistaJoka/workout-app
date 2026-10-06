import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAllTemplates } from '../../domain/content/catalog'
import { DRAFT_TEMPLATE_IDS } from '../../domain/content/fixtures/raeDraftTemplates'
import { pickSurprise, surprisePool } from '../../domain/content/surprise'
import type { WorkoutTemplate } from '../../domain/content/types'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { playCelebration } from '../../application/celebrationSounds'
import { BackButton } from '../components/BackButton'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { RaeFace } from '../components/Rae'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useTheme } from '../theme/ThemeContext'

const CARD_PX = 72
const REEL_CARDS = 12
// How long the pick stays on screen before the Start screen takes over.
const HOLD_MS = 900

type Loaded = { pick: WorkoutTemplate; reel: string[] }

async function load(): Promise<Loaded | null> {
  const [{ curated, custom, herMix }, { plans, results }] = await Promise.all([listAllTemplates(), getAllSessionHistory()])
  const latest = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0]
  const lastTemplateId = latest ? plans.find((p) => p.id === latest.planId)?.templateId ?? null : null
  const pool = surprisePool({ curated, custom, herMix, lastTemplateId, draftIds: DRAFT_TEMPLATE_IDS })
  const pick = pickSurprise(pool)
  if (!pick) return null
  // The reel cycles through the pool and always stops on the pick.
  const reel = Array.from({ length: REEL_CARDS - 1 }, (_, i) => pool[i % pool.length].name)
  return { pick, reel: [...reel, pick.name] }
}

// Surprise me (route /surprise): a slot-machine reel of her routines spins,
// slows and lands on one; Rae cheers; then the Start screen for it. A tap
// skips the spin. Reduced/off motion shows the pick straight away.
export function SurpriseScreen() {
  const navigate = useNavigate()
  const [feedback] = useFeedbackSettings()
  const { motion } = useTheme()
  const spin = effectiveMotion(motion, usePrefersReducedMotion()) === 'full'
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined)
  const [landed, setLanded] = useState(false)
  const cheered = useRef(false)

  useEffect(() => {
    let cancelled = false
    load()
      .then((result) => {
        if (!cancelled) setLoaded(result)
      })
      .catch(() => {
        if (!cancelled) setLoaded(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const showResult = Boolean(loaded) && (landed || !spin)

  // A backgrounded tab can drop animationend; the reel lands regardless.
  useEffect(() => {
    if (!loaded || !spin) return
    const timer = window.setTimeout(() => setLanded(true), 1600)
    return () => window.clearTimeout(timer)
  }, [loaded, spin])

  useEffect(() => {
    if (!showResult || !loaded) return
    if (!cheered.current) {
      cheered.current = true
      playCelebration('badge', feedback)
    }
    const timer = window.setTimeout(() => navigate(`/checkin/${loaded.pick.id}`, { replace: true }), HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [showResult, loaded, feedback, navigate])

  if (loaded === null) {
    return (
      <div className="p-4">
        <BackButton />
      </div>
    )
  }

  return (
    <div className="surprise-stage flex min-h-[80vh] flex-col p-4" onClick={() => setLanded(true)}>
      <div className="self-start">
        <BackButton />
      </div>
      <p className="sr-only" aria-live="polite">
        {showResult && loaded ? `Picked: ${loaded.pick.name}` : ''}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {showResult && loaded ? (
          <div data-testid="surprise-result" className="flex flex-col items-center gap-3 text-center">
            <RaeFace expression="happy" size={72} motion={spin ? 'pop' : 'none'} decorative />
            <p aria-hidden="true" className="text-3xl font-extrabold">
              {loaded.pick.name}
            </p>
          </div>
        ) : loaded ? (
          <div aria-hidden="true" className="card overflow-hidden !p-0" style={{ height: CARD_PX, width: '16rem' }}>
            <div
              className="surprise-reel"
              style={{ '--reel-end': `${-(REEL_CARDS - 1) * CARD_PX}px` } as CSSProperties}
              onAnimationEnd={() => setLanded(true)}
            >
              {loaded.reel.map((name, i) => (
                <p
                  key={i}
                  className="flex items-center justify-center truncate text-2xl font-extrabold"
                  style={{ height: CARD_PX }}
                >
                  {name}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <span aria-hidden="true" className="text-5xl">
          🎲
        </span>
      </div>
    </div>
  )
}
