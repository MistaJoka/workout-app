// Today's compact boss card: this week's boss, its HP bar, and a tiny
// portrait, linking to the full /boss screen. Quietly renders nothing
// while it loads or if history can't be read -- Today never blocks on a
// secondary widget (same convention as AchievementUnlocks/NextUpTeaser).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BossSprite } from './BossArt'
import { loadBossState } from './bossData'
import type { BossState } from '../../domain/game/bosses'

export function BossCard({ now }: { now: Date }) {
  const [state, setState] = useState<BossState | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBossState(now)
      .then((loaded) => {
        if (!cancelled) setState(loaded)
      })
      .catch(() => {
        if (!cancelled) setState(null)
      })
    return () => {
      cancelled = true
    }
  }, [now])

  if (!state) return null
  const defeated = state.defeatedAt !== null
  const pct = state.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((state.hp / state.maxHp) * 100))) : 0

  return (
    <Link
      to="/boss"
      className="field-info flex min-h-11 items-center gap-3 px-4 py-3"
      aria-label={`This week: ${state.boss.name}, ${defeated ? 'defeated' : `${state.hp} of ${state.maxHp} HP`}`}
    >
      <BossSprite boss={state.boss} state={defeated ? 'defeated' : 'idle'} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ink-muted">This week</span>
        <span className="block truncate font-bold">
          {state.boss.name}
          {defeated ? ' — defeated!' : ''}
        </span>
        {!defeated && (
          <>
            <span aria-hidden="true" className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
              <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
            </span>
            <span className="block text-xs text-ink-muted">
              {state.hp}/{state.maxHp} HP
            </span>
          </>
        )}
      </span>
      <span aria-hidden="true" className="text-xl text-ink-muted">
        ›
      </span>
    </Link>
  )
}
