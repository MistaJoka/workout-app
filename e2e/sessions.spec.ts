import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Taps a thumb-bar button once the bar is armed (see ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('button', { name, exact: true }).click()
}

async function startQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
}

// Writes progression rows straight into this profile's database: the
// fastest honest way to put a move at the top of its rep bracket without
// three full workouts first.
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

test.describe('sessions', () => {
  test('a workout left open can be finished from Today, and lands on Complete', async ({ page }) => {
    await startQuick10(page)
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'Yes')

    await page.goto('/#/')
    await expect(page.getByRole('link', { name: 'Resume workout' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await page.getByRole('dialog', { name: 'Finish this workout?' }).getByRole('button', { name: 'Finish now' }).click()
    await expect(page.getByText('Workout complete')).toBeVisible()
    await expect(page.getByText('1 of 6 sets completed')).toBeVisible()
  })

  test('a workout left open can be discarded from Today, and leaves no history', async ({ page }) => {
    await startQuick10(page)
    await page.goto('/#/')
    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Discard this workout?' })
    await sheet.getByRole('button', { name: 'Keep it' }).click()
    await expect(page.getByRole('link', { name: 'Resume workout' })).toBeVisible()

    await page.getByRole('button', { name: 'Discard', exact: true }).click()
    await page.getByRole('dialog', { name: 'Discard this workout?' }).getByRole('button', { name: 'Discard' }).click()
    await expect(page.getByRole('link', { name: 'Resume workout' })).toBeHidden()
    await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()

    await page.getByRole('link', { name: 'Progress' }).click()
    await expect(page.getByRole('link', { name: 'Start a workout' })).toBeVisible()
  })

  test('a workout idle for over 12 hours is finished at its last action, not offered for resume', async ({ page }) => {
    const started = new Date('2026-09-28T09:00:00')
    await page.clock.setFixedTime(started)
    await startQuick10(page)
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'Yes')

    await page.clock.setFixedTime(new Date('2026-09-29T09:30:00'))
    await page.goto('/#/')
    await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Resume workout' })).toBeHidden()

    await page.getByRole('link', { name: 'Progress' }).click()
    await expect(page.getByText('1 workout and 1 sets so far.', { exact: false })).toBeVisible()
    await page.getByRole('link', { name: /Quick 10/ }).first().click()
    await expect(page.getByText(/ended early/)).toBeVisible()
    await expect(page.getByText(/Mon, Sep 28/)).toBeVisible()
  })

  test('the next-level offer on Complete: confirming raises the reps, dismissing keeps them', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Both at the top of their bracket (authored + 4), so a clean session
    // stages an offer for each.
    await seedProgression(page, [
      { exerciseId: 'fs.bodyweight-squat', reps: 14 },
      { exerciseId: 'fs.incline-push-up', reps: 12 },
    ])

    await page.goto('/#/checkin/fs.quick-10')
    await expect(page.getByText('2 × 14 reps')).toBeVisible()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)

    const offers = page.getByRole('button', { name: 'Yes, try it' })
    await expect(offers).toHaveCount(2)
    // Offers list in plan order: squat, then push-up.
    await offers.first().click()
    await expect(offers).toHaveCount(1)
    await page.getByRole('button', { name: 'Not yet' }).click()
    await expect(page.getByRole('button', { name: 'Not yet' })).toHaveCount(0)

    await page.goto('/#/checkin/fs.quick-10')
    await expect(page.getByText('2 × 16 reps')).toBeVisible()
    await expect(page.getByText('2 × 12 reps')).toBeVisible()
  })
})
