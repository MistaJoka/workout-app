import { expect, test, type Page } from '@playwright/test'

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

async function start(page: Page, templateId: string): Promise<void> {
  await page.goto(`/#/checkin/${templateId}`)
  await page.getByRole('button', { name: 'Start workout' }).click()
}

async function skipMove(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this move' }).click()
  await page.getByRole('dialog', { name: `Skip ${name}?` }).getByRole('button', { name: 'Skip', exact: true }).click()
}

test('skipped moves stay out of the way, and a hold counts itself down and completes the set', async ({ page }) => {
  await page.clock.install()
  await start(page, 'fs.quick-10')
  await skipMove(page, 'Bodyweight Squat')
  await skipMove(page, 'Incline Push-Up')
  await expect(page.getByRole('heading', { name: 'Plank' })).toBeVisible()

  await tapArmed(page, 'Start 20s')
  await expect(page.getByRole('timer')).toHaveText('20')
  await page.clock.fastForward(21_000)
  // The hold finished itself: set 1 is logged and rest begins.
  await expect(page.getByText('Rest', { exact: true })).toBeVisible()
  await tapArmed(page, 'Skip rest')
  // Timing it yourself still works.
  await tapArmed(page, 'Complete Set')
  await expect(page.getByText('Workout complete')).toBeVisible()

  // History puts the plank's sets on the plank, not on the skipped squat.
  await page.goto('/#/progress')
  await page.getByRole('link', { name: /Quick 10/ }).click()
  await expect(page.getByText('0/2 sets')).toHaveCount(2)
  await expect(page.getByText('2/2 sets')).toBeVisible()
})

test('"No, fell short" logs the reps actually done', async ({ page }) => {
  await start(page, 'fs.full-body-a')
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'No, fell short')
  await expect(page.getByText('How many reps?')).toBeVisible()
  await expect(page.getByText('9', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fewer reps' }).click()
  await tapArmed(page, 'Save reps')
  await expect(page.getByText('Rest', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()
  await expect(page.getByText('Workout complete')).toBeVisible()

  await page.goto('/#/progress')
  await page.getByRole('link', { name: /Full-Body A/ }).click()
  await expect(page.locator('ol > li').filter({ hasText: '8, missed' })).toHaveCount(1)
})

test('a paused rest keeps the time it had left', async ({ page }) => {
  await page.clock.install()
  await start(page, 'fs.quick-10')
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await expect(page.getByRole('timer')).toHaveText(/0:(29|30)/)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Take your time')).toBeVisible()
  await page.clock.fastForward(120_000)
  await tapArmed(page, 'Resume')
  // Two minutes paused, and the 30s rest still has most of its time.
  await expect(page.getByRole('timer')).toHaveText(/0:(2\d|30)/)
})
