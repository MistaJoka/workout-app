import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

test('Today dates the greeting, the finish screen shows its numbers, and the welcome card retires after a workout', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/#/')
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  await expect(page.getByText(date)).toBeVisible()
  await expect(page.getByText('Welcome')).toBeVisible()

  // Start without dismissing the welcome card.
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByText('10 of 10 sets completed')).toBeVisible()
  await expect(page.getByText('sets', { exact: true })).toBeVisible()
  await expect(page.getByText('moves', { exact: true })).toBeVisible()
  await expect(page.getByText(/^minutes?$/)).toBeVisible()

  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page.getByText('Done for today')).toBeVisible()
  await expect(page.getByText('Welcome')).toBeHidden()
})
