import { useEffect, useRef, useState } from 'react'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { weeklyGoal } from '../../domain/progress/stats'
import { computeXp, levelFor, sessionXpGain, type LevelInfo, type SessionXpGain } from '../../domain/progress/xp'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'
import { useCountUp } from './CountUp'
import { RaeFace } from './Rae'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from './useFeedbackSettings'

// Bloom XP on screen: the +XP chip and level bar on Complete, the level-up
// moment, the "Goal met!" banner, and the level tile on Progress. Everything
// here is decoration over numbers that are always shown as text; nothing
// blocks a tap (the level-up overlay ignores the pointer and fades itself).

export async function loadSessionXp(sessionId: string): Promise<SessionXpGain> {
  const [history, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
  return sessionXpGain(history, weeklyGoal(schedule), sessionId)
}

export async function loadLevel(): Promise<LevelInfo> {
  const [history, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
  return levelFor(computeXp(history, weeklyGoal(schedule)).total)
}

function useFullMotion(): { full: boolean; off: boolean } {
  const { motion } = useTheme()
  const osReduced = usePrefersReducedMotion()
  const effective = effectiveMotion(motion, osReduced)
  return { full: effective === 'full', off: effective === 'off' }
}

// Level N, name, and a slim bar of XP into the level. Shared by Complete and
// Progress so the two always read the same.
export function LevelBar({ level, className = '' }: { level: LevelInfo; className?: string }) {
  const pct = Math.min(100, Math.round((level.into / level.needed) * 100))
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">
          Level {level.level}, {level.name}
        </span>
        <span className="hud-num text-ink-muted">
          {level.into} / {level.needed} XP
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-label={`Level ${level.level}, ${level.name}`}
        aria-valuemin={0}
        aria-valuemax={level.needed}
        aria-valuenow={level.into}
      >
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// "+N XP" counting up after the stats, with the level bar under it.
export function XpGainChip({ gain }: { gain: SessionXpGain }) {
  const shown = useCountUp(gain.gained, 900)
  return (
    <div className="space-y-2 text-left" data-testid="xp-gain">
      <p className="text-center">
        <span className="hud-num text-2xl font-extrabold text-primary-ink" aria-label={`Plus ${gain.gained} XP`}>
          +{shown} XP
        </span>
        {gain.leveledUp && (
          <span className="ml-2 rounded-full bg-field-notice px-2 py-0.5 align-middle text-xs font-bold">Level up!</span>
        )}
      </p>
      <LevelBar level={gain.to} />
    </div>
  )
}

const CONFETTI_COLORS = ['#ff8fb8', '#ffe08a', '#8ec5ff', '#5bbf8a', '#c9a7ff', '#f06a9e']

function Confetti({ count, spread, className = '' }: { count: number; spread: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`xp-confetti pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 37) % 100) + (i % 3)
        const delay = (i % 7) * 70
        const size = 6 + (i % 3) * 2
        return (
          <span
            key={i}
            className="xp-confetti-bit"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${delay}ms`,
              ['--xp-drift' as string]: `${((i % 5) - 2) * spread}px`,
            }}
          />
        )
      })}
    </div>
  )
}

// The level-up moment: a big, warm card over the screen for ~2.5s. It never
// takes a tap (pointer-events none) and fades on its own, so "Back to
// Today" is always reachable; the "Level up!" chip stays once it's gone.
// With motion off there's no overlay at all, only the chip.
export function LevelUpMoment({ to }: { to: LevelInfo }) {
  const { full, off } = useFullMotion()
  const [visible, setVisible] = useState(!off)
  const [feedback] = useFeedbackSettings()
  const played = useRef(false)

  useEffect(() => {
    if (off) return
    const timer = window.setTimeout(() => setVisible(false), 2500)
    return () => window.clearTimeout(timer)
  }, [off])

  // The celebration just appeared: play its fanfare once.
  useEffect(() => {
    if (played.current) return
    played.current = true
    playCelebration('levelUp', feedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <p className="sr-only" role="status">
        Level up! Level {to.level}, {to.name}.
      </p>
      {visible && (
        <div
          aria-hidden="true"
          data-testid="level-up"
          className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/25 ${full ? 'xp-levelup-in' : 'xp-fade-in'}`}
        >
          <div className="relative mx-6 w-full max-w-xs overflow-hidden rounded-panel bg-surface p-6 text-center shadow-lg">
            {full && <Confetti count={28} spread={18} />}
            <div className="relative space-y-2">
              <div className="flex justify-center">
                <RaeFace expression="cheer" size={96} motion={full ? 'pop' : 'none'} />
              </div>
              <p className="text-3xl font-extrabold text-primary-ink">Level {to.level}!</p>
              <p className="text-lg font-bold">{to.name}</p>
            </div>
          </div>
        </div>
      )}
      <XpKeyframes />
    </>
  )
}

// This workout reached the week's goal: a banner with pixel confetti.
export function GoalMetBanner() {
  const { full } = useFullMotion()
  const [feedback] = useFeedbackSettings()
  const played = useRef(false)

  useEffect(() => {
    if (played.current) return
    played.current = true
    playCelebration('goalMet', feedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="relative mx-auto max-w-sm overflow-hidden rounded-panel bg-field-notice px-4 py-3 text-center"
      role="status"
      data-testid="goal-met"
    >
      {full && <Confetti count={16} spread={10} />}
      <p className="relative text-lg font-extrabold">Goal met!</p>
      <p className="relative text-sm text-ink-muted">You hit this week's goal. Anything more is a bonus.</p>
      <XpKeyframes />
    </div>
  )
}

function XpKeyframes() {
  return (
    <style>{`
      .xp-confetti-bit {
        position: absolute;
        top: -10px;
        border-radius: 1px;
        animation: xp-fall 1400ms ease-in forwards;
      }
      @keyframes xp-fall {
        0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate(var(--xp-drift, 0px), 260px) rotate(200deg); opacity: 0; }
      }
      .xp-levelup-in { animation: xp-levelup 2500ms ease-out forwards; }
      .xp-fade-in { animation: xp-fade 2500ms ease-out forwards; }
      @keyframes xp-levelup {
        0% { opacity: 0; }
        12% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes xp-fade {
        0% { opacity: 0; }
        15% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
      }
      [data-motion='off'] .xp-confetti-bit,
      [data-motion='reduced'] .xp-confetti-bit { display: none; }
    `}</style>
  )
}
