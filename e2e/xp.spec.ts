import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Bloom XP: Complete shows what the workout earned, a level-up moment that
// never blocks a tap, and a "Goal met!" banner on the workout that reaches
// the week's goal; Progress shows the level.
test('XP counts up on Complete, levels up without blocking, and Progress shows the level', async ({ page }) => {
  test.setTimeout(150_000)
  // A Wednesday at noon, so both workouts land in the same week.
  await page.clock.install({ time: new Date(2026, 8, 30, 12, 0, 0) })

  // First Full-Body A: 10 sets x 10 + 10 met x 5 + 25 = 175 XP, past level 2 (100).
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByLabel('Plus 175 XP')).toBeVisible()
  await expect(page.getByTestId('xp-gain').getByText('Level up!')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Level 2, Sprout' })).toHaveCount(1)
  await expect(page.getByTestId('goal-met')).toHaveCount(0)
  // The level-up overlay ignores the pointer: Back to Today works right away.
  await expect(page.getByTestId('level-up')).toBeVisible()
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page).toHaveURL(/#\/$/)

  // Second workout reaches the default goal of 2 this week: the banner shows.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByTestId('goal-met')).toBeVisible()
  await expect(page.getByText('Goal met!')).toBeVisible()

  // 175 + (6 x 10 + 6 x 5 + 25 + 50) = 340 XP: level 3 (Bud), 120 into a 140 XP level.
  await page.goto('/#/progress')
  await expect(page.getByTestId('progress-level')).toContainText('Level 3, Bud')
  await expect(page.getByTestId('progress-level')).toContainText('120 / 140 XP')
})

test('with motion off there is no overlay, only the chip', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 8, 30, 12, 0, 0) })
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByTestId('xp-gain').getByText('Level up!')).toBeVisible()
  await expect(page.getByTestId('level-up')).toHaveCount(0)
})
