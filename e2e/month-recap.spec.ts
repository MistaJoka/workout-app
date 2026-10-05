import { expect, test, type Page } from '@playwright/test'

// "Your month in bloom": the monthly "Wrapped"-style recap. The page clock
// is pinned to Oct 2, 2026 (the first few days of a new month), with
// September's sessions seeded straight into IndexedDB (same technique as
// e2e/week-compare.spec.ts). The app must have opened its database at least
// once first (a prior page.goto), so the stores already exist when we open
// it raw.

type Plan = { id: string; exercises: { exerciseId: string; name: string; sets: number; reps: number }[] }
type Result = { sessionId: string; planId: string; endedAt: string; totalSetsCompleted: number }

async function seedHistory(page: Page, seed: { plans: Plan[]; results: Result[] }): Promise<void> {
  await page.evaluate(async ({ plans, results }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['sessionPlans', 'sessionResults'], 'readwrite')
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
            reps: e.reps,
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
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, seed)
}

// Five September 2026 sessions: four on Wednesdays (Sep 2, 9, 16, 23) and
// one on a Friday (Sep 4), so "most active weekday" is unambiguously
// Wednesday. Sep 9, 16 and 23 each fall in a different Monday-start week
// that is wholly inside September (Sep 7-13, 14-20, 21-27), giving a
// three-week streak; Sep 2 and 4 fall in the week starting Mon Aug 31,
// which isn't "inside" September, so they don't extend the streak — only
// the month totals.
const sessionIds = ['sep-2', 'sep-4', 'sep-9', 'sep-16', 'sep-23']
const plans: Plan[] = sessionIds.map((id) => ({ id, exercises: [{ exerciseId: 'squat', name: 'Squat', sets: 2, reps: 10 }] }))
const results: Result[] = [
  { sessionId: 'sep-2', planId: 'sep-2', endedAt: new Date(2026, 8, 2, 9).toISOString(), totalSetsCompleted: 2 },
  { sessionId: 'sep-4', planId: 'sep-4', endedAt: new Date(2026, 8, 4, 9).toISOString(), totalSetsCompleted: 2 },
  { sessionId: 'sep-9', planId: 'sep-9', endedAt: new Date(2026, 8, 9, 9).toISOString(), totalSetsCompleted: 2 },
  { sessionId: 'sep-16', planId: 'sep-16', endedAt: new Date(2026, 8, 16, 9).toISOString(), totalSetsCompleted: 2 },
  { sessionId: 'sep-23', planId: 'sep-23', endedAt: new Date(2026, 8, 23, 9).toISOString(), totalSetsCompleted: 2 },
]

test.describe('monthly recap', () => {
  test('the first days of October offer September in bloom, ahead of the week card, and slides tap through', async ({ page }) => {
    test.setTimeout(150_000)
    await page.clock.install({ time: new Date(2026, 9, 2, 12) }) // Friday Oct 2, 2026

    await page.goto('/#/') // opens the database once
    await seedHistory(page, { plans, results })

    // Reduced motion never auto-advances, so the taps below are the only driver.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('about:blank')
    await page.goto('/#/')

    // The month card wins even though last week (Sep 21-27, which has the
    // Sep 23 session) would also qualify for the weekly offer.
    const monthEntry = page.getByRole('link', { name: /September in bloom/ })
    await expect(monthEntry).toBeVisible()
    await expect(monthEntry).toHaveAccessibleName(/5 workouts, 5 flowers grown/)
    await expect(page.getByRole('link', { name: /Your week in bloom/ })).toHaveCount(0)

    await monthEntry.click()
    await expect(page).toHaveURL(/#\/recap\?month=2026-09/)
    await expect(page.getByRole('heading', { name: 'September in bloom' })).toBeVisible()
    await expect(page.getByText('5 workouts in September.')).toBeVisible()
    await expect(page.getByText('3-week streak')).toBeVisible()

    // Numbers: 5 sessions x 2 sets = 10 sets; each seeded session is 1
    // minute (startedAt === endedAt), so 5 minutes.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('10', { exact: true })).toBeVisible()
    await expect(page.getByText('sets done', { exact: true })).toBeVisible()
    await expect(page.getByText('5', { exact: true })).toBeVisible()
    await expect(page.getByText('minutes moving', { exact: true })).toBeVisible()

    // The mini month calendar.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'September at a glance' })).toBeVisible()
    await expect(page.getByText('5 flowers grew', { exact: true })).toBeVisible()

    // Top day: Wednesday, with 4 of the 5 workouts.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Your top day' })).toBeVisible()
    await expect(page.getByText('Wednesday', { exact: true })).toBeVisible()
    await expect(page.getByText('4 workouts', { exact: true })).toBeVisible()

    // Rarest flower.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Rarest bloom' })).toBeVisible()

    // Wins: five finished workouts unlocks "First bloom" (1st) and "Five
    // strong" (5th).
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: "This month's wins" })).toBeVisible()
    await expect(page.getByText('First bloom', { exact: true })).toBeVisible()
    await expect(page.getByText('Five strong', { exact: true })).toBeVisible()

    // Through to Rae's sign-off and Done, which returns to Today.
    for (let i = 0; i < 6 && !(await page.getByRole('button', { name: 'Done' }).isVisible()); i++) {
      await page.getByRole('button', { name: 'Next' }).click()
    }
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()

    // Once opened, the month card retires (a weekly card may now show
    // instead, since last week also had a workout, but not the month one).
    await expect(page.getByRole('link', { name: /September in bloom/ })).toBeHidden()
  })

  test('a quiet month is gentle and reachable from ?month=, and Progress links to it', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 2, 12) })
    // Progress's recap links only render once there's some history; one
    // filler workout from August (outside October, the quiet month under
    // test) is enough for that, without affecting the quiet October recap.
    await page.goto('/#/')
    await seedHistory(page, {
      plans: [{ id: 'aug-filler', exercises: [{ exerciseId: 'squat', name: 'Squat', sets: 2, reps: 10 }] }],
      results: [{ sessionId: 'aug-filler', planId: 'aug-filler', endedAt: new Date(2026, 7, 1, 9).toISOString(), totalSetsCompleted: 2 }],
    })

    await page.goto('about:blank')
    await page.goto('/#/recap?month=2026-10')
    await expect(page.getByText('A quiet month', { exact: true })).toBeVisible()
    await expect(page.getByText('Rest months count too.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Close your month' }).click()
    await expect(page).toHaveURL(/#\/$/)

    await page.goto('about:blank')
    await page.goto('/#/progress')
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
    const monthly = page.getByRole('link', { name: 'Monthly recap' })
    await expect(monthly).toBeVisible()
    await monthly.click()
    await expect(page).toHaveURL(/#\/recap\?month=2026-10/)
    await expect(page.getByText('A quiet month', { exact: true })).toBeVisible()
  })
})
