import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Each pot on Today's windowsill opens its day: a planned workout still
// ahead starts it, a finished one opens its detail (a pick when there were
// several), and an empty day opens the planner.
test('week flowers open the day: start what is planned, then read back what was done', async ({ page }) => {
  test.setTimeout(150_000)
  const today = WEEKDAYS[new Date().getDay()]
  const other = WEEKDAYS[(new Date().getDay() + 1) % 7]

  await page.goto('/#/schedule')
  await page.getByRole('button', { name: new RegExp(`^${today}`) }).click()
  await page.getByRole('radiogroup', { name: `${today} plan` }).getByRole('radio', { name: 'Quick 10' }).click()
  await expect(page.getByRole('button', { name: `${today} Quick 10` })).toBeVisible()

  // Planned today: the pot starts it.
  await page.goto('/#/')
  await page.getByRole('link', { name: `${today}, today, Quick 10 planned` }).click()
  await expect(page.getByRole('heading', { name: 'Quick 10' })).toBeVisible()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  // Done today: the pot opens that workout.
  await page.goto('/#/')
  await page.getByRole('link', { name: `${today}, today, Quick 10 done` }).click()
  await expect(page).toHaveURL(/#\/history\//)
  await expect(page.getByRole('heading', { name: 'Quick 10' })).toBeVisible()

  // Two workouts today: the pot asks which.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/')
  await page.getByRole('button', { name: `${today}, today, 2 workouts done` }).click()
  const sheet = page.getByRole('dialog', { name: `${today}'s workouts` })
  await expect(sheet.getByRole('link')).toHaveCount(2)
  await sheet.getByRole('link').first().click()
  await expect(page).toHaveURL(/#\/history\//)

  // An empty day opens the planner.
  await page.goto('/#/')
  await page.getByRole('link', { name: `${other}, nothing planned` }).click()
  await expect(page.getByText('Your week')).toBeVisible()
})
