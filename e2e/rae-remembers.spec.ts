import { expect, test, type Page } from '@playwright/test'
import { speciesFor } from '../src/domain/progress/garden'

// Rae's memory lines (src/presentation/raeSays.ts, raeMemory.ts): on roughly
// half of eligible days Rae calls back to something real from the last
// workout instead of a generic line. Seeds sessionPlans/sessionEvents/
// sessionResults straight into IndexedDB (same technique as
// e2e/garden-sets.spec.ts), one "yesterday" workout at a time, and checks
// Today the next day — independently, across several different simulated
// days, so the test isn't at the mercy of a single 50/50 coin flip.

type Seed = {
  sessionId: string
  planId: string
  endedAt: string
  exercises: { exerciseId: string; name: string; sets: number; reps: number }[]
}

async function seedSession(page: Page, seed: Seed): Promise<void> {
  await page.evaluate(async (seed) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['sessionPlans', 'sessionEvents', 'sessionResults'], 'readwrite')
      tx.objectStore('sessionPlans').put({
        id: seed.planId,
        templateId: 'mem-e2e-template',
        templateVersion: 1,
        packId: 'seed',
        ruleVersion: 'v1',
        createdAt: '2026-01-01T00:00:00.000Z',
        exercises: seed.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          exerciseVersion: 1,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          restSeconds: 30,
          order: i,
        })),
        adaptations: [],
        reproducibilityHash: `seed-${seed.planId}`,
      })
      const totalSets = seed.exercises.reduce((n, e) => n + e.sets, 0)
      tx.objectStore('sessionResults').put({
        sessionId: seed.sessionId,
        planId: seed.planId,
        status: 'COMPLETED',
        startedAt: seed.endedAt,
        endedAt: seed.endedAt,
        totalSetsCompleted: totalSets,
        totalSetsPlanned: totalSets,
      })
      // No SESSION_STARTED event: appliedEvents.ts's effectiveSetSlots fills
      // the plan's slots in document order, so a bare list of SET_COMPLETED
      // events (one per set, in exercise order) is enough.
      let i = 0
      for (const e of seed.exercises) {
        for (let s = 0; s < e.sets; s++) {
          tx.objectStore('sessionEvents').add({
            eventId: `${seed.sessionId}-evt-${i++}`,
            sessionId: seed.sessionId,
            type: 'SET_COMPLETED',
            timestamp: '2026-01-01T00:00:00.000Z',
            payload: { met: true, reps: e.reps },
          })
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, seed)
}

// A sessionId whose seeded garden flower (garden.ts: speciesFor) is common,
// so the "rare flower still glowing" memory rule never competes with the
// "standout move" rule this test targets.
function commonSessionId(seed: number): string {
  for (let i = 0; i < 1000; i++) {
    const candidate = `mem-e2e-${seed}-${i}`
    if (speciesFor(candidate).rarity === 'common') return candidate
  }
  throw new Error('no common-rarity sessionId found within 1000 tries')
}

const DAY_MS = 24 * 60 * 60 * 1000

test("Rae recalls yesterday's standout move on a later visit to Today", async ({ page }) => {
  test.setTimeout(120_000)

  const anchor = new Date(2026, 9, 1, 12, 0, 0) // Thu Oct 1, 2026, noon
  await page.clock.install({ time: anchor })
  await page.goto('/#/') // opens the database once

  const bubble = page.getByTestId('rae-says')
  const expected = 'Squats looked strong yesterday!'

  // Each iteration plants a fresh "yesterday" workout (squats: 3 sets, the
  // clear standout; push-ups: 1 set) and checks Today exactly one day
  // later. The memory line only shows on ~half of days (raeSays'
  // useMemoryToday gate), so try several independent days — each a
  // distinct real calendar date, so each is its own coin flip — before
  // concluding the feature is broken.
  for (let i = 0; i < 10; i++) {
    const sessionDate = new Date(anchor.getTime() + i * 2 * DAY_MS)
    const checkDate = new Date(sessionDate.getTime() + DAY_MS)

    await page.clock.setFixedTime(sessionDate)
    await seedSession(page, {
      sessionId: commonSessionId(i),
      planId: `mem-e2e-plan-${i}`,
      endedAt: sessionDate.toISOString(),
      exercises: [
        { exerciseId: 'squat', name: 'Squats', sets: 3, reps: 10 },
        { exerciseId: 'pushup', name: 'Push-Ups', sets: 1, reps: 8 },
      ],
    })

    await page.clock.setFixedTime(checkDate)
    // A hash-only navigation doesn't reload the document (CLAUDE.md gotcha).
    await page.goto('about:blank')
    await page.goto('/#/')
    await expect(bubble).toBeVisible()
    const text = await bubble.textContent()
    if (text === expected) {
      await expect(bubble).toHaveText(expected)
      return
    }
  }

  throw new Error(`Rae never recalled the standout move across 10 independent days (last seen: see trace)`)
})
