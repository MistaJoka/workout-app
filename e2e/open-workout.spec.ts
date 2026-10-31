import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome, openProgressMore } from './helpers'

// A workout in progress is never left or replaced silently: the back
// gesture (page.goBack() here, see navigation-safety.spec.ts) asks first,
// and the Start screen offers the open workout before starting another.

async function tapArmed(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true })
  await expect(button).toBeVisible()
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await button.click()
}

// Today -> Start -> player by taps, so history holds app entries.
async function startFromToday(page: Page): Promise<void> {
  await page.goto('/#/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).first().click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

async function leaveForNow(page: Page): Promise<void> {
  await page.goBack()
  await page.getByRole('dialog', { name: 'Leave this workout?' }).getByRole('button', { name: 'Leave for now' }).click()
  await expect(page).toHaveURL(/#\/$/)
}

test('back mid-workout asks; Keep going stays, Leave for now keeps it open on Today', async ({ page }) => {
  await startFromToday(page)
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await tapArmed(page, 'Skip rest')
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()

  await page.goBack()
  const sheet = page.getByRole('dialog', { name: 'Leave this workout?' })
  await expect(sheet).toBeVisible()
  await expect(page).toHaveURL(/#\/session\//)
  // The safe choice is the focused default.
  await expect(sheet.getByRole('button', { name: 'Keep going' })).toBeFocused()
  await sheet.getByRole('button', { name: 'Keep going' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()

  // Back while the sheet is open = Keep going.
  await page.goBack()
  await expect(sheet).toBeVisible()
  await page.goBack()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/#\/session\//)

  await leaveForNow(page)
  await page.getByRole('link', { name: 'Resume workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
})

test('leaving mid-rest pauses the clock, so it waits on return', async ({ page }) => {
  await startFromToday(page)
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await expect(page.getByRole('timer')).toBeVisible()
  await leaveForNow(page)
  await page.getByRole('link', { name: 'Resume workout' }).click()
  await expect(page.getByText('Take your time')).toBeVisible()
})

test('the Start screen offers the open workout; starting new can save its sets', async ({ page }) => {
  await startFromToday(page)
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await tapArmed(page, 'Skip rest')
  await leaveForNow(page)

  // The same routine: Start just resumes it.
  await page.goto('/#/checkin/fs.full-body-a')
  await expect(page.getByRole('button', { name: 'Resume workout' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start workout' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start new instead' })).toHaveCount(0)

  // Another routine: resume first, or start new.
  await page.goto('/#/checkin/fs.quick-10')
  await expect(page.getByRole('button', { name: 'Resume Full-Body A' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start workout' })).toHaveCount(0)
  await tapArmed(page, 'Resume Full-Body A')
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
  await expect(page.getByRole('button', { name: /1 of 5/ })).toBeVisible()
  await leaveForNow(page)

  await page.goto('/#/checkin/fs.quick-10')
  await tapArmed(page, 'Start new instead')
  const sheet = page.getByRole('dialog', { name: 'Full-Body A is still open' })
  await expect(sheet.getByRole('button', { name: 'Never mind' })).toBeFocused()
  await sheet.getByRole('button', { name: 'Save its sets and end it' }).click()
  await expect(page.getByRole('button', { name: /1 of 3/ })).toBeVisible()

  // Full-Body A ended early with its one set; Quick 10 is the open one.
  await page.goto('/#/progress')
  await openProgressMore(page)
  await expect(page.getByText('Full-Body A')).toBeVisible()
  await page.goto('/#/')
  await expect(page.locator('.today-mission')).toContainText('Quick 10')
})

test('starting new can discard the open workout instead', async ({ page }) => {
  await startFromToday(page)
  await leaveForNow(page)
  await page.goto('/#/checkin/fs.quick-10')
  await tapArmed(page, 'Start new instead')
  await page.getByRole('dialog', { name: 'Full-Body A is still open' }).getByRole('button', { name: 'Discard it' }).click()
  await expect(page.getByRole('button', { name: /1 of 3/ })).toBeVisible()

  await page.goto('/#/progress')
  await openProgressMore(page)
  await expect(page.getByText('Full-Body A')).toHaveCount(0)
})
