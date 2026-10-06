import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Same seeding as sessions.spec.ts: reps at the top of their bracket, so a
// clean usual session would stage an offer for each.
async function seedProgression(page: Page, rows: { exerciseId: string; reps: number }[]): Promise<void> {
  await page.evaluate(async (seed) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('progression', 'readwrite')
      for (const row of seed) {
        tx.objectStore('progression').put({
          exerciseId: row.exerciseId,
          level: 0,
          lastAdvancedAt: null,
          currentPrescribedReps: row.reps,
          currentWeightKg: null,
          consecutiveFailureStreak: 0,
          pendingCandidate: null,
        })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, rows)
}

test('Short runs one set of every move and offers no next level', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await seedProgression(page, [
    { exerciseId: 'fs.bodyweight-squat', reps: 14 },
    { exerciseId: 'fs.incline-push-up', reps: 12 },
  ])

  await page.goto('/#/checkin/fs.quick-10')
  await expect(page.getByRole('radio', { name: /^Usual/ })).toBeChecked()
  await expect(page.getByText('2 × 14 reps')).toBeVisible()
  await page.getByRole('radio', { name: /^Short/ }).click()
  await expect(page.getByRole('radio', { name: /^Short/ })).toBeChecked()
  await expect(page.getByText('1 × 14 reps')).toBeVisible()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText('Set 1 of 1', { exact: true })).toBeVisible()
  await finishWorkout(page)
  await expect(page.getByRole('button', { name: 'Yes, try it' })).toHaveCount(0)
})

test('the dial starts on Usual every time and Long adds a set', async ({ page }) => {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('radio', { name: /^Long/ }).click()
  await expect(page.getByText('3 × 10 reps').first()).toBeVisible()
  await page.goto('about:blank')
  await page.goto('/#/checkin/fs.quick-10')
  await expect(page.getByRole('radio', { name: /^Usual/ })).toBeChecked()
})
