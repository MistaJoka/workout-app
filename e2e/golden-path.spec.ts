import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

test.describe('golden path', () => {
  test('first run: welcome, check-in, a full workout, and it shows up in Progress', async ({ page }) => {
    test.setTimeout(180_000) // ten sets with rests to skip
    await page.goto('/')
    await expect(page.getByText('Welcome')).toBeVisible()
    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByText('Welcome')).toBeHidden()

    await page.getByRole('link', { name: /Full-Body A/ }).click()
    await expect(page.getByText('How are you feeling?')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Session Preview')).toBeVisible()
    await expect(page.getByText('Bodyweight Squat')).toBeVisible()
    await page.getByRole('button', { name: 'Start Workout' }).click()

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

    // Rotation moved on, and Progress recorded it.
    await expect(page.getByRole('link', { name: /Full-Body B/ })).toContainText('Up next')
    await page.getByRole('link', { name: 'Progress' }).click()
    await expect(page.getByText('workout', { exact: true })).toBeVisible()
    await expect(page.getByText('10', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Full-Body A')).toBeVisible()
  })

  test('an in-progress workout survives a reload and can be resumed from Today', async ({ page }) => {
    await page.goto('/')
    await dismissWelcome(page)
    await page.getByRole('link', { name: /Quick 10/ }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Start Workout' }).click()
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    const timer = page.getByRole('timer')
    await expect(timer).toBeVisible()

    // +15s is persisted (REST_EXTENDED), so the extended deadline survives
    // a reload. Quick 10 rests are 30s; after the bump the countdown must
    // still read above 30s once the page comes back.
    await page.getByRole('button', { name: '+15s' }).click({ timeout: 3_000, force: true })
    await expect(timer).toHaveText(/^0:(3[1-9]|4[0-5])$/)
    await page.reload()
    await expect(timer).toBeVisible()
    await expect(timer).toHaveText(/^0:(3[1-9]|4[0-5])$/)

    await page.goto('/#/')
    await expect(page.getByText('Resume workout')).toBeVisible()
  })
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
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('4 sets × 10 reps')).toBeVisible()

    await page.goto('/#/')
    await expect(page.getByText('Your routines')).toBeVisible()
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
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Start Workout' }).click()
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
    const row = page.locator('section, li, div').filter({ hasText: new RegExp(`^${today}`) }).first()
    await row.getByRole('button', { name: 'Quick 10' }).click()

    await page.goto('/#/')
    const card = page.getByRole('link', { name: /Quick 10/ })
    await expect(card).toContainText(today)
  })

  test('profiles keep two people separate on one device', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(page.getByText('Welcome')).toBeHidden()

    await page.getByRole('button', { name: /Profile: Me/ }).click()
    await page.getByRole('button', { name: '+ Add a person' }).click()
    await page.getByPlaceholder('Their name').fill('Kay')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    // New person: fresh data, so the welcome card is back.
    await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()
    await expect(page.getByText('Welcome')).toBeVisible()

    await page.getByRole('button', { name: /Profile: Kay/ }).click()
    // The row button's accessible name is its initial plus the name: "M Me".
    await page.getByRole('dialog').getByRole('button', { name: /\bMe\b/ }).click()
    await expect(page.getByRole('button', { name: /Profile: Me/ })).toBeVisible()
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
    const erase = page.getByRole('button', { name: 'Erase everything' })
    await expect(erase).toBeDisabled()
    await page.getByPlaceholder('Type DELETE to enable').fill('DELETE')
    await expect(erase).toBeEnabled()
  })
})

// Guards the parity run itself: each project must really render its theme,
// or the Pixel Bloom pass would silently re-test Savage Core.
test('renders the theme this project is testing', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name)
})
