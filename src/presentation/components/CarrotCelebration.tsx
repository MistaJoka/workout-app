import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { earnedCarrots, carrotsForSession, type SessionCarrots } from '../../domain/rewards/carrots'
import { weeklyGoal } from '../../domain/progress/stats'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { totalSpent } from '../../infrastructure/db/repositories/redemptionsRepository'
import { useCountUp } from './CountUp'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'

// Carrots on screen: Today's balance chip and the +N carrots chip on
// Complete. Mirrors XpCelebration.tsx's loadSessionXp/loadLevel pattern --
// carrots are derived from history every time (domain/rewards/carrots.ts),
// never stored, so nothing here can drift from what actually happened.

export async function loadCarrotBalance(): Promise<number> {
  const [{ plans, results, events }, schedule, spent] = await Promise.all([
    getAllSessionHistory(),
    getWeeklySchedule(),
    totalSpent(),
  ])
  const earned = earnedCarrots({ plans, results, events }, weeklyGoal(schedule)).total
  return earned - spent
}

export async function loadSessionCarrots(sessionId: string): Promise<SessionCarrots | null> {
  const [{ plans, results, events }, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
  return carrotsForSession({ plans, results, events }, weeklyGoal(schedule), sessionId)
}

// Today's chip, near the greeting: the current balance, linking to the shop.
// Renders nothing while loading or if the balance couldn't be read, same
// convention as Today's other best-effort reads -- it never blocks the rest
// of the header.
export function CarrotBalanceChip() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadCarrotBalance()
      .then((b) => {
        if (!cancelled) setBalance(b)
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (balance === null) return null

  return (
    <Link
      to="/rewards"
      className="chip bg-field-notice gap-1 px-3"
      aria-label={`${balance} carrots. Open Hubby Bunny's reward shop`}
      data-testid="carrot-balance-chip"
    >
      <span aria-hidden="true">🥕</span>
      <span className="hud-num font-bold">{balance}</span>
    </Link>
  )
}

// "+N" counting up on Complete, inside the rewards card's RewardItem slot.
// Renders nothing if this session earned no carrots (never happens today --
// every finished session pays at least the workout bonus -- but keeps the
// convention every other RewardItem follows).
export function CarrotGainChip({ gain }: { gain: SessionCarrots }) {
  const shown = useCountUp(gain.total, 900)
  if (gain.total <= 0) return null
  return (
    <p className="text-center" data-testid="carrot-gain">
      <span className="hud-num text-2xl font-extrabold text-primary-ink" role="img" aria-label={`Plus ${gain.total} carrots`}>
        +{shown} 🥕
      </span>
    </p>
  )
}

const BURST_BITS = ['🥕', '💖', '🥕', '💕', '🥕', '💗'] as const

// A quick heart/carrot burst behind the coupon when a redemption lands --
// decorative only (the coupon's text is the real information), so it's
// skipped entirely under reduced/off motion rather than shown static.
export function CarrotBurst() {
  const { motion } = useTheme()
  const osReduced = usePrefersReducedMotion()
  if (effectiveMotion(motion, osReduced) !== 'full') return null
  return (
    <div aria-hidden="true" className="carrot-burst pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        .carrot-burst-bit { position: absolute; top: 45%; left: 50%; font-size: 1.5rem; animation: carrot-burst-pop 900ms cubic-bezier(.2,.9,.3,1.1) both; }
        @keyframes carrot-burst-pop {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--cb-x, 0px)), calc(-50% + var(--cb-y, 0px))) scale(1); opacity: 0; }
        }
      `}</style>
      {BURST_BITS.map((bit, i) => {
        const angle = (i / BURST_BITS.length) * Math.PI * 2
        const x = Math.round(Math.cos(angle) * 70)
        const y = Math.round(Math.sin(angle) * 70)
        return (
          <span
            key={i}
            className="carrot-burst-bit"
            style={{ animationDelay: `${i * 40}ms`, ['--cb-x' as string]: `${x}px`, ['--cb-y' as string]: `${y}px` }}
          >
            {bit}
          </span>
        )
      })}
    </div>
  )
}
