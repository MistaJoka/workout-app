import { describe, expect, it } from 'vitest'
import { BOSS_CARROT_BONUS, bossCarrotSources, withBossCarrots } from './bossCarrots'
import type { SessionCarrots } from './carrots'

const defeat = (sessionId: string, at: string) => ({ weekStart: '2026-09-28', bossId: 'squat-slime', defeatedAt: at, sessionId })

describe('boss carrots', () => {
  it('pays a fixed bonus once per defeated boss, keyed by the defeating session', () => {
    const sources = bossCarrotSources([defeat('s1', '2026-09-30T12:00:00.000Z'), defeat('s9', '2026-10-07T12:00:00.000Z')], (id) => (id === 'squat-slime' ? 'Squat Slime' : id))
    expect(sources).toEqual([
      { id: 's1:boss', at: '2026-09-30T12:00:00.000Z', amount: BOSS_CARROT_BONUS, label: 'Squat Slime defeated' },
      { id: 's9:boss', at: '2026-10-07T12:00:00.000Z', amount: BOSS_CARROT_BONUS, label: 'Squat Slime defeated' },
    ])
  })

  it('adds the bonus to the defeating session only', () => {
    const base: SessionCarrots = { sessionId: 's1', endedAt: 'x', sources: [{ id: 's1:workout', at: 'x', amount: 10, label: 'Workout finished' }], total: 10 }
    const sources = bossCarrotSources([defeat('s1', 'x')], () => 'Squat Slime')
    expect(withBossCarrots(base, sources)?.total).toBe(10 + BOSS_CARROT_BONUS)
    expect(withBossCarrots({ ...base, sessionId: 's2' }, sources)?.total).toBe(10)
    expect(withBossCarrots(null, sources)).toBeNull()
  })
})
