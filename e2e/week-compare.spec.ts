import { expect, test, type Page } from '@playwright/test'

// "This week vs last" on Progress: writes sessionPlans/sessionEvents/
// sessionResults straight into this profile's database (same technique as
// e2e/meadow.spec.ts and e2e/sessions.spec.ts), with the page clock pinned
// to a fixed Tuesday so "this week" and "last week" are deterministic. The
// app must have opened its database at least once first (a prior
// page.goto), so the stores already exist when we open it raw.

type Plan = {
  id: string
  exercises: { exerciseId: string; name: string; sets: number; reps?: number; timeSeconds?: number }[]
}
type Result = { sessionId: string; planId: string; endedAt: string; totalSetsCompleted: number }
type Ev = { eventId: string; sessionId: string; met?: boolean; reps?: number }

async function seedHistory(page: Page, seed: { plans: Plan[]; results: Result[]; events: Ev[] }): Promise<void> {
  await page.evaluate(async ({ plans, results, events }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['sessionPlans', 'sessionEvents', 'sessionResults'], 'readwrite')
      for (const p of plans) {
        tx.objectStore('sessionPlans').put({
          id: p.id,
          templateId: 'seed-template',
          templateVersion: 1,
          packId: 'seed',
          ruleVersion: 'v1',
          createdAt: '2026-01-01T00:00:00.000Z',
          exercises: p.exercises.map((e, i) => ({
            exerciseId: e.exerciseId,
            exerciseVersion: 1,
            name: e.name,
            sets: e.sets,
            ...(e.reps != null ? { reps: e.reps } : {}),
            ...(e.timeSeconds != null ? { timeSeconds: e.timeSeconds } : {}),
            restSeconds: 30,
            order: i,
          })),
          adaptations: [],
          reproducibilityHash: `seed-${p.id}`,
        })
      }
      for (const r of results) {
        tx.objectStore('sessionResults').put({
          sessionId: r.sessionId,
          planId: r.planId,
          status: 'COMPLETED',
          startedAt: r.endedAt,
          endedAt: r.endedAt,
          totalSetsCompleted: r.totalSetsCompleted,
          totalSetsPlanned: r.totalSetsCompleted,
        })
      }
      // No SESSION_STARTED event: appliedEvents.ts's effectiveSetSlots
      // fills the plan's slots in document order for history with no start
      // event, so a bare list of SET_COMPLETED events is enough.
      for (const e of events) {
        tx.objectStore('sessionEvents').add({
          eventId: e.eventId,
          sessionId: e.sessionId,
          type: 'SET_COMPLETED',
          timestamp: '2026-01-01T00:00:00.000Z',
          payload: { met: e.met ?? true, ...(e.reps != null ? { reps: e.reps } : {}) },
        })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, seed)
}

const squatOnly: Plan = { id: 'wk-sq', exercises: [{ exerciseId: 'squat', name: 'Squat', sets: 2, reps: 10 }] }
const squatAndHold = (holdSeconds: number): Plan => ({
  id: `wk-hp-${holdSeconds}`,
  exercises: [
    { exerciseId: 'squat', name: 'Squat', sets: 2, reps: 15 },
    { exerciseId: 'plank', name: 'Plank', sets: 1, timeSeconds: holdSeconds },
  ],
})

function repSets(sessionId: string, count: number, reps: number): Ev[] {
  return Array.from({ length: count }, (_, i) => ({ eventId: `${sessionId}-${i}`, sessionId, reps }))
}

async function openProgress(page: Page): Promise<void> {
  // A hash-only navigation doesn't reload the document (CLAUDE.md gotcha).
  await page.goto('about:blank')
  await page.goto('/#/progress')
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
}

test.describe('This week vs last', () => {
  // Tuesday Oct 6, 2026 — the week of Mon Oct 5 is "this week", the week of
  // Mon Sep 28 is "last week" (same Monday-start convention as
  // e2e/recap.spec.ts and e2e/week-flowers.spec.ts).
  const tuesday = new Date(2026, 9, 6, 12)

  test('a stronger week than last surfaces its best highlights, counting up to the true numbers', async ({ page }) => {
    await page.clock.install({ time: tuesday })
    await page.goto('/#/progress') // opens the database once

    await seedHistory(page, {
      plans: [squatOnly, squatAndHold(40)],
      results: [
        { sessionId: 'prevA', planId: 'wk-sq', endedAt: new Date(2026, 8, 30, 10).toISOString(), totalSetsCompleted: 2 },
        { sessionId: 'curA', planId: squatAndHold(40).id, endedAt: new Date(2026, 9, 6, 9).toISOString(), totalSetsCompleted: 3 },
        { sessionId: 'curB', planId: 'wk-sq', endedAt: new Date(2026, 9, 8, 9).toISOString(), totalSetsCompleted: 2 },
      ],
      events: [...repSets('prevA', 2, 10), ...repSets('curA', 2, 15), { eventId: 'curA-hold', sessionId: 'curA' }, ...repSets('curB', 2, 15)],
    })

    // Reduced motion lands the counted-up numbers immediately (same
    // technique as e2e/recap.spec.ts), so assertions don't race the climb.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openProgress(page)

    const card = page.getByTestId('week-compare')
    await expect(card).toBeVisible()
    await expect(card.getByText('This week vs last')).toBeVisible()
    const chips = card.getByTestId('week-compare-chip')
    await expect(chips).toHaveCount(3)
    await expect(chips.nth(0)).toHaveText('Most workouts in a week!')
    await expect(chips.nth(1)).toHaveText('Most sets in a week!')
    await expect(chips.nth(2)).toHaveText('Longest hold yet: 40s')
    await expect(card.getByTestId('week-compare-fallback')).toHaveCount(0)
  })

  test('a quiet week (nothing finished yet) reads calmly, never as a loss', async ({ page }) => {
    await page.clock.install({ time: tuesday })
    await page.goto('/#/progress')

    // Only last week has a workout; this week is still empty.
    await seedHistory(page, {
      plans: [squatOnly],
      results: [{ sessionId: 'prevA', planId: 'wk-sq', endedAt: new Date(2026, 8, 30, 10).toISOString(), totalSetsCompleted: 2 }],
      events: repSets('prevA', 2, 10),
    })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openProgress(page)

    const card = page.getByTestId('week-compare')
    await expect(card).toBeVisible()
    await expect(card.getByTestId('week-compare-chip')).toHaveCount(0)
    await expect(card.getByTestId('week-compare-fallback')).toHaveText('Rest weeks count too.')
    // Never a red/down framing of the quieter week.
    await expect(card.getByText(/-\d/)).toHaveCount(0)
    await expect(card.getByText(/▼|↓/)).toHaveCount(0)
  })
})
