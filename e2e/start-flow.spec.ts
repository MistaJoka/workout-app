import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

test('the start screen shows how long, what comes first, and offers a warm-up', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await expect(page.getByText(/\d+ moves, \d+ sets, about \d+ min/)).toBeVisible()
  await expect(page.getByRole('region', { name: /^Up first: / })).toBeVisible()

  const warmUp = page.getByRole('link', { name: /Warm up first/ })
  await expect(warmUp).toContainText(/\d+ moves, about \d+ min/)
  await warmUp.click()
  await expect(page.getByRole('heading', { name: 'Warm-up' })).toBeVisible()
  // No warm-up offered before the warm-up itself.
  await expect(page.getByRole('link', { name: /Warm up first/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()
})

test('a main workout ends with an optional cool-down; the cool-down does not', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  const coolDown = page.getByRole('link', { name: /Cool down/ })
  await expect(coolDown).toBeVisible()
  await coolDown.click()
  await expect(page.getByRole('heading', { name: 'Cool-down' })).toBeVisible()

  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect(page.getByRole('link', { name: /Cool down/ })).toHaveCount(0)
})
