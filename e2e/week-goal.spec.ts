import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// A week keeps the goal it started with (domain/progress/weekGoals.ts).
// Rewards are derived from history, so before this fix raising the goal
// mid-week re-scored the week: the goal bonus, boss win and carrots that
// were already earned (and maybe spent) disappeared.
test('raising the weekly goal mid-week takes nothing back, and starts Monday', async ({ page }) => {
  test.setTimeout(240_000)
  // Pin to a Tuesday midday so the week can't roll over mid-test.
  const now = new Date()
  const day = now.getDay()
  const tuesday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (day === 0 ? -5 : 2 - day))
  tuesday.setHours(12, 0, 0, 0)
  await page.clock.install({ time: tuesday })

  // No schedule: goal 2. Two workouts meet it.
  for (let i = 0; i < 2; i++) {
    await page.goto('about:blank')
    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)
  }
  await page.goto('about:blank')
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: 'Goal met, 2 of 2. Plan your week.' })).toBeVisible()
  const carrotsBefore = ((await page.getByTestId('carrot-balance-chip').textContent()) ?? '').replace(/\D/g, '')
  expect(Number(carrotsBefore)).toBeGreaterThan(0)
  const bossCard = page.getByRole('link', { name: /^This week: .*, defeated$/ })
  await expect(bossCard).toBeVisible()

  // Plan three days: the new goal is 3, but this week already started at 2.
  await page.goto('/#/schedule')
  for (const [day, workout] of [['Monday', 'Full-Body A'], ['Wednesday', 'Full-Body B'], ['Friday', 'Full-Body A']]) {
    await page.getByRole('button', { name: new RegExp(`^${day}`) }).click()
    await page.getByRole('radio', { name: workout }).click()
    await expect(page.getByRole('button', { name: new RegExp(`^${day}`) })).toContainText(workout)
  }
  // In-app hops (no reload) so the last save isn't cut off; the screen
  // re-reads everything when it mounts again.
  await page.goto('/#/')
  await page.goto('/#/schedule')
  await expect(page.getByTestId('goal-starts-monday')).toHaveText("This week's goal stays at 2. Your new goal of 3 starts Monday.")

  // Everything earned this week stands.
  await page.goto('about:blank')
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: 'Goal met, 2 of 2. Plan your week.' })).toBeVisible()
  await expect(page.getByTestId('carrot-balance-chip')).toHaveAttribute('aria-label', new RegExp(`^${carrotsBefore} carrots`))
  await expect(page.getByRole('link', { name: /^This week: .*, defeated$/ })).toBeVisible()
})
