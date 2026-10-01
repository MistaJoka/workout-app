import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Today pulls toward the week's goal (goal gradient), shows the road to the
// next milestone from zero (endowed progress), and names a streak only once
// there is one. Nothing shames a zero.
test('momentum on Today: goal gradient, milestone bar, bloom chip', async ({ page }) => {
  test.setTimeout(150_000)
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  await page.clock.install({ time: noon })

  await page.goto('/#/')
  await expect(page.getByText("2 more to hit your week's goal")).toBeVisible()
  await expect(page.getByRole('progressbar', { name: /to your 5th workout/ })).toHaveCount(0)
  await expect(page.getByText(/-week bloom/)).toHaveCount(0)

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/')
  await expect(page.getByText("1 more to hit your week's goal")).toBeVisible()
  await expect(page.getByRole('progressbar', { name: '1 of 5 to your 5th workout' })).toBeVisible()
  await expect(page.getByText(/-week bloom/)).toHaveCount(0)

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/')
  await expect(page.getByText('Anything extra is a bonus.')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: '2 of 5 to your 5th workout' })).toBeVisible()
  await expect(page.getByText('1-week bloom')).toBeVisible()
})
