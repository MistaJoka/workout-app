import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Badges are derived from history: one full Full-Body A at midday earns
// "First bloom", "Full set" and "Full-Body explorer"; the rest wait as invitations, never as
// something missed. The clock is pinned to midday so the time-of-day badges
// (early bird, night owl) can't flip with the hour the suite runs.
test('a first full workout earns its badges; the rest say how to earn them', async ({ page }) => {
  test.setTimeout(120_000)
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  await page.clock.install({ time: noon })

  await page.goto('/#/achievements')
  await expect(page.getByText(/^0 of \d+ earned$/)).toBeVisible()

  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/achievements')
  await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible()
  await expect(page.getByText(/^3 of \d+ earned$/)).toBeVisible()
  await expect(page.getByRole('listitem', { name: /^First bloom, earned/ })).toBeVisible()
  await expect(page.getByRole('listitem', { name: /^Full set, earned/ })).toBeVisible()
  await expect(page.getByRole('listitem', { name: /^Full-Body explorer, earned/ })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'Early bird, not yet: Finish a workout before 8 in the morning.' })).toBeVisible()
})
