// One rewards-card slot on the Complete screen: the hit this session just
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
// landed on the week's boss, with a quick shake+flash and the HP bar
// dropping from before- to after-this-session, and a trophy burst if this
// exact session was the one that finished it off. Renders nothing when the
// session dealt no damage (a plan-less/empty session) or history can't be
// read -- same "a missing celebration is never an error" rule as every
// other reward here.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BossSprite } from './BossArt'
import {
  bossDefeats,
  bossState as computeBossState,
  damageFromSession,
  type Boss,
  type BossHistory,
} from '../../domain/game/bosses'
import { getAllSessionHistory, getEventsForSession, getPlan, getResult } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from './useFeedbackSettings'

type Hit = {
  boss: Boss
  damage: number
  hpBefore: number
  hpAfter: number
  maxHp: number
  defeated: boolean
}

async function loadHit(sessionId: string): Promise<Hit | null> {
  const [plan, result, events, history, schedule] = await Promise.all([
    getPlan(sessionId),
    getResult(sessionId),
    getEventsForSession(sessionId),
    getAllSessionHistory(),
    getWeeklySchedule(),
  ])
  if (!plan || !result) return null
  const { damage } = damageFromSession(plan, events)
  if (damage <= 0) return null

  // Built from the full history, so "before" below is judged against the
  // same week goal as "after".
  const goal = await loadWeekGoals({ ...history, schedule })
  const now = new Date(result.endedAt)
  const after = computeBossState(history, goal, now)
  // "Before" replays the same week with this session's own result removed,
  // so the bar has something honest to drop from -- not a guess.
  const withoutThisSession: BossHistory = { ...history, results: history.results.filter((r) => r.sessionId !== sessionId) }
  const before = computeBossState(withoutThisSession, goal, now)
  const defeated = bossDefeats(history, goal).some((d) => d.sessionId === sessionId)

  return { boss: after.boss, damage, hpBefore: before.hp, hpAfter: after.hp, maxHp: after.maxHp, defeated }
}

export function BossHitReward({ sessionId }: { sessionId: string }) {
  const [hit, setHit] = useState<Hit | null>(null)
  const [feedback] = useFeedbackSettings()
  const played = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadHit(sessionId)
      .then((loaded) => {
        if (!cancelled) setHit(loaded)
      })
      .catch(() => {
        if (!cancelled) setHit(null)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // The card just appeared with a real hit: play its sound once.
  useEffect(() => {
    if (played.current || !hit) return
    played.current = true
    playCelebration(hit.defeated ? 'bossDefeat' : 'bossHit', feedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hit])

  if (!hit) return null
  const pctBefore = hit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hit.hpBefore / hit.maxHp) * 100))) : 0
  const pctAfter = hit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((hit.hpAfter / hit.maxHp) * 100))) : 0

  return (
    <section
      className="boss-hit-reward flex items-center gap-3"
      aria-label={hit.defeated ? `${hit.boss.name} defeated!` : `You hit ${hit.boss.name} for ${hit.damage}`}
    >
      <style>{BOSS_HIT_STYLE}</style>
      <BossSprite boss={hit.boss} state={hit.defeated ? 'defeated' : 'hurt'} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{hit.defeated ? `${hit.boss.name} defeated!` : `You hit ${hit.boss.name} for ${hit.damage}!`}</span>
        <span
          aria-hidden="true"
          className="boss-hit-bar mt-1 block h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
          style={{ '--boss-hit-before': `${pctBefore}%`, '--boss-hit-after': `${pctAfter}%` } as CSSProperties}
        >
          <span className="boss-hit-bar__fill block h-full rounded-full bg-[var(--color-primary)]" />
        </span>
        {hit.defeated && <span className="mt-1 block text-sm font-semibold">🏆 Trophy earned</span>}
      </span>
    </section>
  )
}

const BOSS_HIT_STYLE = `
.boss-hit-bar__fill { width: var(--boss-hit-before); animation: boss-hit-drop 0.5s ease-out 0.2s both; }
[data-motion='reduced'] .boss-hit-bar__fill, [data-motion='off'] .boss-hit-bar__fill { animation: none; width: var(--boss-hit-after); }
@media (prefers-reduced-motion: reduce) { .boss-hit-bar__fill { animation: none; width: var(--boss-hit-after); } }
@keyframes boss-hit-drop { from { width: var(--boss-hit-before); } to { width: var(--boss-hit-after); } }
`
