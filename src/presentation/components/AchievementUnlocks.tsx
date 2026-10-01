import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  evaluateAchievements,
  newlyUnlocked,
  type AchievementIcon,
  type EvaluatedAchievement,
} from '../../domain/progress/achievements'
import { weeklyGoal } from '../../domain/progress/stats'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from './useFeedbackSettings'

// Every achievement, evaluated from this profile's history. Read-only and
// derived each time, so nothing can drift or be lost.
export async function loadAchievements(): Promise<EvaluatedAchievement[]> {
  const [history, schedule] = await Promise.all([getAllSessionHistory(), getWeeklySchedule()])
  return evaluateAchievements(history, weeklyGoal(schedule))
}

// 8x8 pixel badges on the Pixel Bloom palette. Letters map to colours; '.'
// is empty. Locked badges reuse the same shape as a soft silhouette.
const COLORS: Record<string, string> = {
  p: '#ff8fb8', // petal
  P: '#f06a9e', // petal dark
  g: '#5bbf8a', // leaf
  G: '#3f9d6e', // leaf dark
  y: '#ffe08a', // gold
  Y: '#f5b942', // gold dark
  b: '#8ec5ff', // sky
  B: '#5a8fd6', // sky dark
  l: '#c9b6ff', // lavender
  L: '#9a82e6', // lavender dark
  o: '#ffb27a', // clay
  O: '#e0874e', // clay dark
  w: '#ffffff',
}

const ICONS: Record<AchievementIcon, string[]> = {
  sprout: ['........', '..g..g..', '.ggG.Gg.', '..GgGg..', '....G...', '...oOo..', '...oOo..', '....o...'],
  flower: ['...pp...', '..pPPp..', '.ppyYpp.', '..pYyp..', '...pp...', '....g...', '..gGg...', '....g...'],
  bouquet: ['.pp..ll.', 'pyyp.lyl', '.pp..ll.', '..g..g..', '..gggg..', '...GG...', '..oOOo..', '...oo...'],
  tree: ['..gggg..', '.gGgggG.', 'gggGgggg', '.gGggGg.', '..gggg..', '...OO...', '...OO...', '..oOOo..'],
  calendar: ['.P....P.', 'pppppppp', 'PPPPPPPP', 'pwwwwwwp', 'pwPwPwwp', 'pwwwPwwp', 'pwPwwwwp', 'pppppppp'],
  target: ['..pppp..', '.pwwwwp.', 'pwpppwwp', 'pwpyypwp', 'pwpyypwp', 'pwwpppwp', '.pwwwwp.', '..pppp..'],
  sun: ['...y....', '.y.y.y..', '..yYy...', 'yyYYYyy.', '..yYy...', '.y.y.y..', '...y....', '........'],
  moon: ['...lll..', '..lL....', '.lL.....', '.lL...y.', '.lL.....', '..lL....', '...lll..', '........'],
  star: ['...yy...', '...yy...', 'yyyYYyyy', '.yyYYyy.', '..yyyy..', '.yy..yy.', '.y....y.', '........'],
  heart: ['........', '.pp..pp.', 'pPPppPPp', 'pPPPPPPp', '.pPPPPp.', '..pPPp..', '...pp...', '........'],
  compass: ['..bbbb..', '.bwwwwb.', 'bwwPwwwb', 'bwwPPwwb', 'bwwBBwwb', 'bwwwBwwb', '.bwwwwb.', '..bbbb..'],
  hourglass: ['oOOOOOOo', '.oyyyyo.', '..oyyo..', '...oo...', '...oo...', '..oyyo..', '.oyyyyo.', 'oOOOOOOo'],
  door: ['.OOOOOO.', '.OooooO.', '.OooooO.', '.OoooyO.', '.OooooO.', '.OooooO.', '.OooooO.', 'gggggggg'],
  flame: ['...o....', '...oo...', '..oyo...', '..oyyo..', '.oyYyo..', '.oyYYyo.', '.oYYYYo.', '..oooo..'],
  trophy: ['yyyyyyyy', 'yYyyyyYy', '.yYyyYy.', '..yYYy..', '...yy...', '...yy...', '..YYYY..', '.yyyyyy.'],
  medal: ['.b....b.', '..b..b..', '...bb...', '..yyyy..', '.yYyyYy.', '.yyYYyy.', '.yYyyYy.', '..yyyy..'],
}

export function AchievementBadge({ icon, locked = false, size = 48 }: { icon: AchievementIcon; locked?: boolean; size?: number }) {
  const rows = ICONS[icon]
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={locked ? '#d9dcea' : (COLORS[c] ?? '#000')} />
          )
        )
      )}
    </svg>
  )
}

const STYLE = `
@keyframes achievement-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
.achievement-pop { animation: achievement-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }
[data-motion='reduced'] .achievement-pop, [data-motion='off'] .achievement-pop { animation: none; }
@media (prefers-reduced-motion: reduce) { .achievement-pop { animation: none; } }
`

// Newly earned badges for one finished session, as a small celebratory card
// with a way into the full collection. Renders nothing when there's nothing
// new or history can't be read (a missing celebration is never an error).
export function AchievementUnlocks({ sessionId }: { sessionId: string }) {
  const [unlocked, setUnlocked] = useState<EvaluatedAchievement[] | null>(null)
  const [feedback] = useFeedbackSettings()
  const played = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadAchievements()
      .then((all) => {
        if (!cancelled) setUnlocked(newlyUnlocked(all, sessionId))
      })
      .catch(() => {
        if (!cancelled) setUnlocked([])
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // The card just appeared with at least one unlock: play its sparkle once.
  useEffect(() => {
    if (played.current || !unlocked || unlocked.length === 0) return
    played.current = true
    playCelebration('badge', feedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  if (!unlocked || unlocked.length === 0) return null
  const [first, ...rest] = unlocked
  return (
    <section className="field-info achievement-pop w-full space-y-3 p-4" aria-label="Achievements unlocked">
      <style>{STYLE}</style>
      <ul className="space-y-2">
        {[first, ...rest.slice(0, 2)].map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <AchievementBadge icon={a.icon} size={40} />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-ink-muted">Unlocked</span>
              <span className="block font-bold">{a.title}</span>
            </span>
          </li>
        ))}
      </ul>
      {rest.length > 2 && <p className="text-sm text-ink-muted">and {rest.length - 2} more</p>}
      <Link to="/achievements" className="btn-secondary min-h-11 w-full">
        See your badges
      </Link>
    </section>
  )
}
