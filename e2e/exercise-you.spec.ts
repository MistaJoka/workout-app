import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

test('Exercise Detail shows "You" only once the move has history, and links to it', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/#/exercise/fs.bodyweight-squat')
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your history with this move' })).toHaveCount(0)

  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('about:blank')
  await page.goto('/#/exercise/fs.bodyweight-squat')
  const you = page.getByRole('region', { name: 'Your history with this move' })
  await expect(you).toBeVisible()
  await expect(you.getByText(/1 session, last/)).toBeVisible()
  await expect(you.getByText('10 reps')).toBeVisible()
  await expect(you.getByText('10, 10 ✓')).toBeVisible()

  await you.getByRole('link', { name: 'See your history' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await expect(page).toHaveURL(/#\/progress\/fs\.bodyweight-squat$/)
})
