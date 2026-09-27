import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

test.describe('golden path', () => {
  test('first run: welcome, check-in, a full workout, and it shows up in Progress', async ({ page }) => {
    test.setTimeout(180_000) // ten sets with rests to skip
    await page.goto('/')
    await expect(page.getByText('Welcome')).toBeVisible()
    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByText('Welcome')).toBeHidden()

    // Today leads with one workout under Rae; check-in and the preview are
    // one screen, with one Start.
    await expect(page.locator('.today-mission')).toContainText('Full-Body A')
    await page.getByRole('link', { name: 'Start workout' }).click()
    await expect(page.getByText('How are you feeling?')).toBeVisible()
    await expect(page.getByText('Bodyweight Squat')).toBeVisible()
    await page.getByRole('radio', { name: '4' }).first().click()
    await page.getByRole('button', { name: 'Start workout' }).click()

    // The player shows the movement and its steps, not just a name.
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await expect(page.getByText(/Set 1 of 2/)).toBeVisible()
    await expect(page.locator('img[alt*="start position"]')).toBeVisible()
    await expect(page.getByText(/Stand with your feet shoulder width apart/)).toBeVisible()

    // Reps-based sets ask the yes/no question; the rest screen counts down.
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await expect(page.getByText(/Did you complete all 10 reps\?/)).toBeVisible()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await finishWorkout(page)
    await expect(page.getByText('10 of 10 sets completed')).toBeVisible()
    await page.getByRole('link', { name: 'Back to Today' }).click()

    // Today says it's done and a flower bloomed; Progress recorded it.
    await expect(page.locator('.today-mission')).toContainText('Done for today')
    await expect(page.locator('.today-mission')).toContainText('Full-Body A, 10 sets')
    await expect(page.getByText('1 workout this week')).toBeVisible()
    await page.getByRole('link', { name: 'Progress' }).click()
    await expect(page.getByText('workout', { exact: true })).toBeVisible()
    await expect(page.getByText('10', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Full-Body A')).toBeVisible()
  })

  test('an in-progress workout survives a reload and can be resumed from Today', async ({ page }) => {
    await page.goto('/')
    await dismissWelcome(page)
    await page.getByRole('link', { name: /Quick 10/ }).click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    const timer = page.getByRole('timer')
    await expect(timer).toBeVisible()

    // +15s is persisted (REST_EXTENDED), so the extended deadline survives
    // a reload. Quick 10 rests are 30s; after the bump the countdown must
    // still read above 30s once the page comes back.
    await expect(page.locator('[data-armed="true"]')).toBeVisible()
    await page.getByRole('button', { name: '+15s' }).click({ timeout: 3_000, force: true })
    await expect(timer).toHaveText(/^0:(3[1-9]|4[0-5])$/)
    await page.reload()
    await expect(timer).toBeVisible()
    await expect(timer).toHaveText(/^0:(3[1-9]|4[0-5])$/)

    await page.goto('/#/')
    await expect(page.getByText('Resume workout')).toBeVisible()
  })
})

test('a double tap on Skip rest does not also complete the next set', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Complete Set' }).click()
  await page.getByRole('button', { name: 'Yes', exact: true }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await expect(page.locator('[data-armed="true"]')).toBeVisible()

  // Two quick taps on the same spot: the second lands where the player's
  // Complete Set appears, and must be ignored.
  const box = await page.getByRole('button', { name: 'Skip rest' }).boundingBox()
  if (!box) throw new Error('Skip rest not laid out')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.click(x, y)
  await page.waitForTimeout(250)
  await page.mouse.click(x, y)

  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page.getByText(/Did you complete all/)).toBeHidden()
})

test.describe('library and routines', () => {
  test('search the library, build a routine from it, and start that routine', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.getByText(/\d+ exercises/).first()).toBeVisible()

    await page.getByPlaceholder('Search exercises').fill('squat')
    await page.getByRole('button', { name: /^Filters/ }).click()
    await page.getByRole('button', { name: 'No equipment' }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('2 exercises')).toBeVisible()

    await page.getByRole('link', { name: /Bodyweight Squat/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await page.getByRole('button', { name: 'Add to a routine' }).click()

    await page.getByPlaceholder('Routine name').fill('Leg Day')
    await page.getByRole('button', { name: 'Increase Sets' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()

    await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()
    await expect(page.getByText('4 × 10')).toBeVisible()

    await page.getByRole('link', { name: 'Start workout' }).click()
    await expect(page.getByText('4 sets × 10 reps')).toBeVisible()

    await page.goto('/#/')
    await expect(page.getByText(/Your routine,/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Leg Day/ })).toBeVisible()
  })

  test('a weighted exercise gets a weight stepper and logs the load', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Push Day')
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder('Search exercises').fill('barbell bench press')
    await page.getByRole('button', { name: /Barbell Bench Press - Medium Grip/ }).click()

    await expect(page.getByText('Weight (lb)')).toBeVisible()
    await page.getByRole('button', { name: 'Increase Weight (lb)' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByText(/3 × 10 @ 50 lb/)).toBeVisible()

    await page.getByRole('link', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await expect(page.getByText(/10 reps @ 50 lb/)).toBeVisible()
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await page.getByRole('button', { name: 'More weight' }).click()
    await expect(page.getByText(/@ 55 lb/)).toBeVisible()
  })
})

test.describe('setup for two people', () => {
  test('weekly schedule drives Today', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(page.getByText('Your week')).toBeVisible()
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
    // One button per day; tapping it opens that day's choices.
    await page.getByRole('button', { name: new RegExp(`^${today}`) }).click()
    await page.getByRole('radiogroup', { name: `${today} plan` }).getByRole('radio', { name: 'Quick 10' }).click()
    await expect(page.getByRole('button', { name: new RegExp(`^${today} Quick 10`) })).toBeVisible()

    await page.goto('/#/')
    const mission = page.locator('.today-mission')
    await expect(mission).toContainText('Quick 10')
    await expect(mission).toContainText(today)
  })

  test('profiles keep two people separate on one device', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByText('Welcome')).toBeHidden()

    // Who's working out lives at the top of Settings.
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByRole('button', { name: /Profile: Me/ }).click()
    await page.getByRole('button', { name: '+ Add a person' }).click()
    await page.getByPlaceholder('Their name').fill('Kay')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    // New person: fresh data, so the welcome card is back.
    await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()
    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('Welcome')).toBeVisible()

    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByRole('button', { name: /Profile: Kay/ }).click()
    // The row button's accessible name is its initial plus the name: "M Me".
    await page.getByRole('dialog').getByRole('button', { name: /\bMe\b/ }).click()
    await expect(page.getByRole('button', { name: /Profile: Me/ })).toBeVisible()
    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('Welcome')).toBeHidden()
  })
})

test.describe('utilities', () => {
  test('offline strip, About build info, and reset guard', async ({ page }) => {
    await page.goto('/#/about')
    await expect(page.getByText(/Version \d+\.\d+\.\d+ \([0-9a-f]{7}\)/)).toBeVisible()

    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByText(/Offline/)).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByText(/Offline/)).toBeHidden()

    await page.goto('/#/settings')
    await page.getByText('Danger zone').click()
    const erase = page.getByRole('button', { name: 'Erase everything' })
    await expect(erase).toBeDisabled()
    await page.getByPlaceholder('Type DELETE to enable').fill('DELETE')
    await expect(erase).toBeEnabled()
  })
})

