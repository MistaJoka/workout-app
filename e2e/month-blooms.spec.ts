import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Progress's month calendar: a flower on each day with a finished workout;
// one workout opens its detail, several ask which. The clock is pinned to
// a fixed midday (time still flows) so the day can't change mid-run.
test('the month calendar blooms on workout days and opens them', async ({ page }) => {
  test.setTimeout(150_000)
  await page.clock.install({ time: new Date(2026, 8, 30, 12) })

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/progress')
  const month = page.getByRole('region', { name: 'This month' })
  await expect(month).toBeVisible()
  await expect(month.getByText('1 day in bloom')).toBeVisible()
  // Only this month has workouts: nothing to page to either way.
  await expect(month.getByRole('button', { name: 'Previous month' })).toBeDisabled()
  await expect(month.getByRole('button', { name: 'Next month' })).toBeDisabled()

  await month.getByRole('link', { name: 'September 30, today, 1 workout done' }).click()
  await expect(page).toHaveURL(/#\/history\//)
  await expect(page.getByRole('heading', { name: 'Quick 10' })).toBeVisible()

  // A second workout the same day: the day asks which one.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/progress')
  await page.getByRole('button', { name: 'September 30, today, 2 workouts done' }).click()
  const sheet = page.getByRole('dialog', { name: 'September 30 workouts' })
  await expect(sheet.getByRole('link')).toHaveCount(2)
  await sheet.getByRole('link').first().click()
  await expect(page).toHaveURL(/#\/history\//)
})
