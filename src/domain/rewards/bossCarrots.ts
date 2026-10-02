import type { CarrotSource, SessionCarrots } from './carrots'

// Beating the week's boss (domain/game/bosses.ts) pays carrots through
// earnedCarrots' extraCarrotSources hook. One source per defeat, keyed by the
// defeating session, so a boss can never pay twice.
export const BOSS_CARROT_BONUS = 30

type Defeat = { bossId: string; defeatedAt: string; sessionId: string }

export function bossCarrotSources(defeats: readonly Defeat[], bossName: (id: string) => string): CarrotSource[] {
  return defeats.map((d) => ({
    id: `${d.sessionId}:boss`,
    at: d.defeatedAt,
    amount: BOSS_CARROT_BONUS,
    label: `${bossName(d.bossId)} defeated`,
  }))
}

// One session's carrots plus the boss bonus it earned, if it was the one
// that landed the final hit.
export function withBossCarrots(session: SessionCarrots | null, sources: readonly CarrotSource[]): SessionCarrots | null {
  if (!session) return null
  const extra = sources.filter((s) => s.id === `${session.sessionId}:boss`)
  if (extra.length === 0) return session
  return {
    ...session,
    sources: [...session.sources, ...extra],
    total: session.total + extra.reduce((sum, s) => sum + s.amount, 0),
  }
}
