import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

test('Today offers to plan the week after the first workout, until a day is planned', async ({ page }) => {
  // First open belongs to the Welcome card; no planning card competes with it.
  await page.goto('/#/')
  await expect(page.getByText('Welcome')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plan your week' })).toBeHidden()

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/')

  await expect(page.getByRole('heading', { name: 'Plan your week' })).toBeVisible()
  await page.getByRole('link', { name: 'Plan my week' }).click()
  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible()

  // Planning any one day retires the card.
  const day = WEEKDAYS[(new Date().getDay() + 1) % 7]
  await page.getByRole('button', { name: new RegExp(`^${day}`) }).click()
  await page.getByRole('radiogroup', { name: `${day} plan` }).getByRole('radio', { name: 'Full-Body A' }).click()
  await expect(page.getByRole('button', { name: `${day} Full-Body A` })).toBeVisible()

  await page.goto('/#/')
  // One planned day makes the goal 1, already met by this workout.
  await expect(page.getByText(/Goal met/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plan your week' })).toBeHidden()
})
