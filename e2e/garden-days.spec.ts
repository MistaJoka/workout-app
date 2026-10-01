import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SPECIES =
  'Pink Bloom|Sky Daisy|Buttercup|Lilac Puff|Peach Poppy|Mint Star|Cherry Pop|Cloud Bell|Coral Twist|Ocean Iris|Plum Heart|Lime Zest|Moon Lily|Ember Rose|Golden Sun'

// A done day in the week (Today) and the month (Progress) shows the garden
// species its workout grew, named at the end of the day's label, and today's
// new flower bounces in only the first time Today shows it.
test("week and month show the species each day's workout grew", async ({ page }) => {
  test.setTimeout(120_000)
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  await page.clock.install({ time: noon })
  const today = WEEKDAYS[noon.getDay()]

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/')
  const pot = page.getByRole('link', { name: new RegExp(`^${today}, today, Quick 10 done, (${SPECIES})$`) })
  await expect(pot).toBeVisible()
  const label = (await pot.getAttribute('aria-label')) ?? ''
  const species = label.split(', ').pop()
  await expect(pot.locator('svg.week-blooms__new')).toHaveCount(1)

  // Second visit: the flower is still that species, but no bounce.
  await page.goto('about:blank')
  await page.goto('/#/')
  await expect(pot).toBeVisible()
  await expect(pot).toHaveAttribute('aria-label', label)
  await expect(pot.locator('svg.week-blooms__new')).toHaveCount(0)

  await page.goto('/#/progress')
  await expect(page.getByRole('link', { name: new RegExp(`, today, 1 workout done, ${species}$`) })).toBeVisible()
})
