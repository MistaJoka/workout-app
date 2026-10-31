// Pinned before any Date is made: the golden digests below depend on local
// week and day boundaries.
process.env.TZ = 'America/New_York'

import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { clonedHistory, syntheticHistory, SYNTHETIC_MOVE_IDS, type SyntheticHistory } from '../domain/progress/__fixtures__/syntheticHistory'
import { projectSetRecords } from '../domain/progress/history'
import { evaluateAchievements } from '../domain/progress/achievements'
import { computeXp, sessionXpGain } from '../domain/progress/xp'
import { earnedCarrots, carrotsForSession } from '../domain/rewards/carrots'
import { bossCarrotSources } from '../domain/rewards/bossCarrots'
import { bossDefeats, bossState, pastBossWeeks } from '../domain/game/bosses'
import { sessionHighlights } from '../domain/progress/sessionHighlights'
import { summarizeLastTime } from '../domain/session/lastTime'
import { buildGarden } from '../domain/progress/garden'
import { goalBlooms } from '../domain/progress/goalBloom'
import { calculateWeekStreak, detectPersonalRecords, weekProgress, weeklyTotals } from '../domain/progress/stats'
import { buildMonthRecap, buildWeekRecap } from '../domain/progress/recap'
import { compareWeeks } from '../domain/progress/weekCompare'
import { flowStatus } from '../domain/session/flow'
import { buildWeekGoals, mondayKey } from '../domain/progress/weekGoals'
import { buildRaeMemory } from '../presentation/raeMemory'
import { sessionEventsOf } from '../domain/progress/historyIndex'
import type { SessionEvent } from '../domain/session/types'

// History makes Today, Progress, Badges, Recap and Complete slow (UX audit
// 2026-10-29, P3): about two years at three workouts a week. Each hot pure
// function must stay well inside a budget on that history, and give exactly
// the answer it gave before the history index (the digests were recorded
// from the implementation before it).

const now = new Date(2026, 9, 29, 18, 0)
// Varied history, and the audit's plateau (one workout cloned: no new best
// ever, the worst case for best searches).
const HISTORIES: Record<string, SyntheticHistory> = {
  varied: syntheticHistory({ sessions: 300, now }),
  plateau: clonedHistory({ sessions: 300, now }),
}
const base = HISTORIES.varied

// A fresh copy of every array, so no per-array cache from an earlier call
// can answer: the cost of a screen's first read after a write.
function fresh(base: SyntheticHistory) {
  return {
    plans: [...base.plans],
    results: [...base.results],
    events: [...base.events],
    activities: [...base.activities],
  }
}

type Fresh = SyntheticHistory

function goalsFor(h: Fresh) {
  return buildWeekGoals({ plans: h.plans, results: h.results, activities: h.activities, legacyGoal: 2, currentGoal: 3 })
}

function digest(value: unknown): string {
  const json = JSON.stringify(value, (_key, v) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v))
  return createHash('sha256').update(json).digest('hex').slice(0, 16)
}

const latest = (h: Fresh) => [...h.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt)).slice(-5).map((r) => r.sessionId)

// name -> the computation, run on its own fresh history.
const CASES: Record<string, (h: Fresh) => unknown> = {
  projectSetRecords: (h) => projectSetRecords(h.plans, h.results, h.events),
  evaluateAchievements: (h) => evaluateAchievements(h, goalsFor(h)),
  computeXp: (h) => computeXp(h, goalsFor(h)),
  sessionXpGain: (h) => latest(h).map((id) => sessionXpGain(h, goalsFor(h), id)),
  earnedCarrots: (h) => {
    const goals = goalsFor(h)
    return earnedCarrots(h, goals, bossCarrotSources(bossDefeats(h, goals), (id) => id))
  },
  carrotsForSession: (h) => latest(h).map((id) => carrotsForSession(h, goalsFor(h), id)),
  bosses: (h) => {
    const goals = goalsFor(h)
    return [bossDefeats(h, goals), bossState(h, goals, now), pastBossWeeks(h, goals, now)]
  },
  sessionHighlights: (h) => {
    const records = projectSetRecords(h.plans, h.results, h.events)
    return h.results.map((r) => sessionHighlights(records, h.results, r.sessionId))
  },
  sessionHighlightsSortedResults: (h) => {
    // raeMemory passes a sorted copy of the results, not the projected array.
    const records = projectSetRecords(h.plans, h.results, h.events)
    const ordered = [...h.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
    return ordered.slice(-20).map((r) => sessionHighlights(records, ordered, r.sessionId))
  },
  summarizeLastTime: (h) => SYNTHETIC_MOVE_IDS.map((id) => summarizeLastTime(h.plans, h.results, h.events, id)),
  garden: (h) => {
    const goals = goalsFor(h)
    return [buildGarden(h.results, goals), goalBlooms(h.results, goals)]
  },
  weekStats: (h) => {
    const goals = goalsFor(h)
    return [
      calculateWeekStreak(h.results, goals, now, h.activities),
      weekProgress(h.results, goals, now, h.activities),
      weeklyTotals(h.results, now, 8),
      [...detectPersonalRecords(projectSetRecords(h.plans, h.results, h.events)).values()],
    ]
  },
  recaps: (h) => {
    const goals = goalsFor(h)
    const badges = evaluateAchievements(h, goals)
    const weeks = Array.from({ length: 10 }, (_, i) => new Date(2026, 9, 26 - 7 * i))
    const months = Array.from({ length: 6 }, (_, i) => new Date(2026, 9 - i, 1))
    return [...weeks.map((w) => buildWeekRecap(h, badges, goals, w)), ...months.map((m) => buildMonthRecap(h, badges, m))]
  },
  compareWeeks: (h) => compareWeeks(h, goalsFor(h), now),
  flowStatus: (h) => {
    const byId = new Map(h.plans.map((p) => [p.id, p]))
    return h.results.map((r) => flowStatus(byId.get(r.planId)!, sessionEventsOf(h.events, r.sessionId)))
  },
  weekGoals: (h) => {
    const goals = goalsFor(h)
    return h.results.map((r) => [mondayKey(new Date(r.endedAt)), goals(new Date(r.endedAt))])
  },
  raeMemory: (h) => buildRaeMemory({ plans: h.plans, results: h.results, events: h.events, templateNames: {}, now }),
}

// Recorded from the implementation before the history index (2026-10-29);
// evaluateAchievements re-recorded 2026-10-31 for the after-midnight night
// owl rule.
// raeMemory re-recorded when it gained `yesterday` (2026-10-31).
const GOLDEN: Record<string, string> = {
  'varied.projectSetRecords': 'f56e549133a23d1a',
  'varied.evaluateAchievements': '2ec9d134995ac793',
  'varied.computeXp': '5ce025d96becc480',
  'varied.sessionXpGain': '415bf7d2f94951e7',
  'varied.earnedCarrots': '8cec41a71aa7d8dc',
  'varied.carrotsForSession': '54512ae15f5eaa3a',
  'varied.bosses': 'dbb1f5fe574b2d3f',
  'varied.sessionHighlights': 'af40f2a6607a93ef',
  'varied.sessionHighlightsSortedResults': 'e01724ec27988b7b',
  'varied.summarizeLastTime': '72db5769a14ca6fb',
  'varied.garden': 'f2abbff89026699e',
  'varied.weekStats': 'daaacfde46644673',
  'varied.recaps': 'a350dce9929470a3',
  'varied.compareWeeks': 'e86ada3620305a07',
  'varied.flowStatus': '0e7090169fc87455',
  'varied.weekGoals': '7a6a8ef58ce0c2db',
  'varied.raeMemory': '6ebc2180b8de1778',
  'plateau.projectSetRecords': '2e897fb8ee6e2c3f',
  'plateau.evaluateAchievements': 'bb9999dd5787e176',
  'plateau.computeXp': 'a569f34b72a91213',
  'plateau.sessionXpGain': 'da81661c37452835',
  'plateau.earnedCarrots': 'ce5b5aeebd65dcce',
  'plateau.carrotsForSession': '3fc72093438b7f9d',
  'plateau.bosses': '2d3ecc52e5ba62ab',
  'plateau.sessionHighlights': '842bac3f96f2d690',
  'plateau.sessionHighlightsSortedResults': '07c4c2d3f792d510',
  'plateau.summarizeLastTime': '965c8a9cc6c190ec',
  'plateau.garden': '3a7692b20c964f42',
  'plateau.weekStats': 'f4c6e469cc1815d7',
  'plateau.recaps': '9bd98a0391888483',
  'plateau.compareWeeks': 'b7e353a7a2b991a7',
  'plateau.flowStatus': '1e4414f516c21818',
  'plateau.weekGoals': 'b2a2e1c0fca04575',
  'plateau.raeMemory': 'a9671aa9c44afd87',
}

// Generous: the indexed code takes 2-35 ms per case on a desktop (fresh
// arrays, nothing cached), so a slow or busy CI box passes. The two cases
// that were quadratic get a tighter bound their old cost (135-180 ms on the
// same desktop) fails; the rest catch anything gone badly superlinear.
const DEFAULT_BUDGET_MS = 250
const BUDGET_MS: Record<string, number> = { sessionHighlights: 100, recaps: 100 }

describe('history at two years (300 workouts)', () => {
  it('is a realistic history', () => {
    expect(base.results).toHaveLength(300)
    expect(base.events.length).toBeGreaterThan(8000)
    expect(new Set(base.events.map((e: SessionEvent) => e.sessionId)).size).toBe(304)
  })

  for (const [kind, history] of Object.entries(HISTORIES))
  for (const [caseName, run] of Object.entries(CASES)) {
    const name = `${kind}.${caseName}`
    it(`${name} gives the same answer, inside its budget`, () => {
      const h = fresh(history)
      const started = performance.now()
      const out = run(h)
      const ms = performance.now() - started
      expect(digest(out)).toBe(GOLDEN[name])
      expect(ms).toBeLessThan(BUDGET_MS[caseName] ?? DEFAULT_BUDGET_MS)
    })
  }
})
