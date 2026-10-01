import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

test('the flow chip appears at the first milestone and quietly resets on a miss', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()

  // Set 1 (squat): run 1, no chip yet.
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await expect(page.getByText(/^Flow x/)).toBeHidden()
  await tapArmed(page, 'Skip rest')

  // Set 2 (squat): run 2, still below the first milestone (3).
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await expect(page.getByText(/^Flow x/)).toBeHidden()
  await tapArmed(page, 'Skip rest')

  // Set 3 (push-up): run 3, the chip shows.
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await tapArmed(page, 'Skip rest')
  await expect(page.getByText('Flow x3')).toBeVisible()

  // Set 4 (push-up) falls short: the run resets, quietly (no red, no message).
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'No, fell short')
  await expect(page.getByText('How many reps?')).toBeVisible()
  await tapArmed(page, '7 reps')
  await tapArmed(page, 'Skip rest')
  await expect(page.getByText(/^Flow x/)).toBeHidden()
  await expect(page.getByText(/fell short|missed/i)).toBeHidden()
})

test('a clean run earns a Perfect workout stamp and a next-up teaser on Complete', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect(page.getByText('Perfect workout!')).toBeVisible()
  await expect(page.getByText(/^Next up:/)).toBeVisible()
})

test('a session with a fallen-short set does not earn the Perfect stamp', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'No, fell short')
  await tapArmed(page, '9 reps')

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()

  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect(page.getByText('Perfect workout!')).toBeHidden()
})
