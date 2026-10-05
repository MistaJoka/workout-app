import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

test.describe('golden path', () => {
  test('first run: welcome, one-tap start, a full workout, and it shows up in Progress', async ({ page }) => {
    test.setTimeout(180_000) // ten sets with rests to skip
    await page.goto('/')

    // Today leads with one workout under Rae; the start screen shows what
    // you're about to do and asks nothing: one tap starts.
    await expect(page.locator('.today-mission')).toContainText('Full-Body A')
    await page.getByRole('link', { name: 'Start workout' }).click()
    await expect(page.getByRole('list', { name: 'Your workout' })).toContainText('Bodyweight Squat')
    await expect(page.getByText(/\d+ moves, \d+ sets/)).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
    await page.getByRole('button', { name: 'Start workout' }).click()

    // The player shows the movement and its steps, not just a name.
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await expect(page.getByText(/Set 1 of 2/)).toBeVisible()
    // Rae demonstrates the curated moves in place of the photos.
    await expect(page.getByAltText('Rae doing a bodyweight squat')).toBeVisible()
    await expect(page.getByText(/Stand with your feet shoulder width apart/)).toBeVisible()

    // Reps-based sets ask the yes/no question; the rest screen counts down.
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await expect(page.getByText(/Did you complete all 10 reps\?/)).toBeVisible()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await finishWorkout(page)
    // The sets stat tile now folds "N of M" into its own value (Complete
    // screen rewrite): "10/10" with a "sets" label, not a separate sentence.
    await expect(page.getByText('10/10')).toBeVisible()
    await page.getByRole('link', { name: 'Back to Today' }).click()

    // Today says it's done and a flower bloomed; Progress recorded it.
    await expect(page.locator('.today-mission')).toContainText('Done for today')
    await expect(page.locator('.today-mission')).toContainText('Full-Body A, 10 sets')
    await expect(page.getByRole('link', { name: '1 of 2 this week. Plan your week.' })).toBeVisible()
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
    // No equipment for now (owner, 2026-09-28): the library shows only moves
    // that need nothing, so there is no equipment filter. Bodyweight Squat,
    // Rae's Mini Squat and Chair Squat Tap, Freehand Jump Squat, and the two
    // upstream squats that list no equipment (Sit Squats, Split Squats).
    await expect(page.getByText('6 exercises')).toBeVisible()
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByText('Equipment', { exact: true })).toBeHidden()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByText('Split Squats')).toBeVisible()

    await page.getByRole('link', { name: /Bodyweight Squat/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await page.getByRole('button', { name: 'Add to a routine' }).click()

    await page.getByPlaceholder('Routine name').fill('Leg Day')
    await page.getByRole('button', { name: 'Increase Sets' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()

    await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()
    await expect(page.getByText('4 × 10')).toBeVisible()

    await page.getByRole('link', { name: 'Start workout' }).click()
    await expect(page.getByText('4 × 10 reps')).toBeVisible()

    await page.goto('/#/')
    await expect(page.getByRole('link', { name: /your routine,/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Leg Day/ })).toBeVisible()
  })

  // Weighted moves are hidden while the library is no-equipment only
  // (NO_EQUIPMENT_ONLY in src/domain/content/library.ts). Weight logging
  // itself is unchanged; re-enable this with the flag.
  test.skip('a weighted exercise gets a weight stepper and logs the load', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Push Day')
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder('Search exercises').fill('dumbbell bench press')
    await page.getByRole('button', { name: /^Dumbbell Bench Press(?! with)/ }).click()

    // Weighted moves start unloaded; the lifter dials in their own load.
    await expect(page.getByText('Weight (lb)')).toBeVisible()
    for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Increase Weight (lb)' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByText(/3 × 10 @ 50 lb/)).toBeVisible()

    await page.getByRole('link', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await expect(page.getByText(/@ 50 lb/)).toBeVisible()
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await page.getByRole('button', { name: 'More weight' }).click()
    await expect(page.getByText(/@ 55 lb/)).toBeVisible()
  })

  test('removing an exercise can be undone, and leaving unsaved edits asks first', async ({ page }) => {
    await page.goto('/#/library')
    await page.getByPlaceholder('Search exercises').fill('bodyweight squat')
    await page.getByRole('link', { name: /Bodyweight Squat/ }).first().click()
    await page.getByRole('button', { name: 'Add to a routine' }).click()
    await expect(page.getByText('Bodyweight Squat')).toBeVisible()

    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('Removed Bodyweight Squat')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()

    await page.getByRole('button', { name: /Back/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Leave without saving?' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
    await page.getByRole('button', { name: /Back/ }).click()
    await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave' }).click()
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
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

    // Who's working out lives at the top of Settings.
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByRole('button', { name: /Profile: Me/ }).click()
    await page.getByRole('button', { name: '+ Add a person' }).click()
    await page.getByPlaceholder('Their name').fill('Kay')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    // New person: Today greets her by her own name.
    await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()
    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/, Kay$/)

    await page.getByRole('link', { name: 'Settings' }).click()
    await page.getByRole('button', { name: /Profile: Kay/ }).click()
    // The row button's accessible name is its initial plus the name: "M Me".
    await page.getByRole('dialog').getByRole('button', { name: /\bMe\b/ }).click()
    await expect(page.getByRole('button', { name: /Profile: Me/ })).toBeVisible()
    await page.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/Kay/)
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

