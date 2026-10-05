import { expect, test } from '@playwright/test'
import { finishWorkout, openProgressMore } from './helpers'

test.describe('progress states', () => {
  test('a fresh profile sees zeroed tiles, the week goal and a way to start', async ({ page }) => {
    await page.goto('/#/progress')
    await expect(page.getByText('0 of 2', { exact: true })).toBeVisible()
    await expect(page.getByText('sets done', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Start a workout' }).click()
    await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Full-Body A' })).toBeVisible()
  })

  test('exercise history draws one bar per session and invites a second go', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)

    await page.goto('/#/progress')
    await openProgressMore(page)
    await page.getByRole('link', { name: /Bodyweight Squat/ }).click()
    await expect(page.getByRole('img', { name: /^1 session, best \d+ on / })).toBeVisible()
    await expect(page.getByText('Do it again to see a trend.')).toBeVisible()

    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)
    await page.goto('/#/progress')
    await openProgressMore(page)
    await page.getByRole('link', { name: /Bodyweight Squat/ }).click()
    await expect(page.getByRole('img', { name: /^2 sessions, best \d+ on / })).toBeVisible()
    await expect(page.getByText('every set done')).toBeVisible()
    await expect(page.getByText('Do it again to see a trend.')).toHaveCount(0)
  })
})
