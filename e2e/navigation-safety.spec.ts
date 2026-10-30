import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

// The Android back gesture is page.goBack() here: a history traversal the
// app can't block, only catch (components/historySentinel.ts).

// Today -> Library -> New routine by taps, so history holds app entries
// (a typed-in hash has no router state behind it).
async function openNewRoutine(page: Page): Promise<void> {
  await page.goto('/#/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Library' }).click()
  await page.getByRole('link', { name: /New routine/ }).first().click()
  await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
}

test('after a finish, Back to Today leaves Complete out of history', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/')
  await dismissWelcome(page)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await page.goBack()
  await expect(page).not.toHaveURL(/\/complete/)
  await expect(page.getByText('Workout complete')).toHaveCount(0)
})

test('an unknown route lands on Today with the tab bar', async ({ page }) => {
  await page.goto('/#/does-not-exist')
  await dismissWelcome(page)
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
})

test('not-found screens share one look with a way out', async ({ page }) => {
  await page.goto('/#/session/nope/complete')
  await dismissWelcome(page)
  await expect(page.getByTestId('not-found')).toBeVisible()
  await expect(page.getByText('Workout complete')).toHaveCount(0)

  await page.goto('/#/routines/nope/edit')
  await expect(page.getByTestId('not-found')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New routine' })).toHaveCount(0)

  await page.goto('/#/exercise/nope')
  await expect(page.getByTestId('not-found')).toBeVisible()
  // A typed-in link has no app history behind it: Back goes to Today.
  await page.getByRole('button', { name: /Back/ }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('back with unsaved builder edits asks first; Keep editing keeps them, Leave leaves', async ({ page }) => {
  await openNewRoutine(page)
  await page.getByPlaceholder('Routine name').fill('Half done')

  await page.goBack()
  const sheet = page.getByRole('dialog', { name: 'Leave without saving?' })
  await expect(sheet).toBeVisible()
  await expect(page).toHaveURL(/#\/routines\/new$/)
  await sheet.getByRole('button', { name: 'Keep editing' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByPlaceholder('Routine name')).toHaveValue('Half done')

  // Back again: still guarded. Back while the sheet is open = Keep editing.
  await page.goBack()
  await expect(sheet).toBeVisible()
  await page.goBack()
  await expect(sheet).toBeHidden()
  await expect(page.getByPlaceholder('Routine name')).toHaveValue('Half done')

  await page.goBack()
  await sheet.getByRole('button', { name: 'Leave' }).click()
  await expect(page).toHaveURL(/#\/library$/)
  await expect(page.getByRole('heading', { name: 'New routine' })).toHaveCount(0)
})

test('Leave from the in-app Back leaves no stray entries behind', async ({ page }) => {
  await openNewRoutine(page)
  await page.getByPlaceholder('Routine name').fill('Half done')
  await page.getByRole('button', { name: /Back/ }).click()
  await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave' }).click()
  await expect(page).toHaveURL(/#\/library$/)
  await page.goBack()
  await expect(page).toHaveURL(/#\/$/)
})

test('back closes an open sheet instead of leaving; a normal close leaves history as it was', async ({ page }) => {
  await page.goto('/#/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Library' }).click()
  await expect(page).toHaveURL(/#\/library$/)

  await page.getByRole('button', { name: /^Filters/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await expect(sheet).toBeVisible()
  await page.goBack()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/#\/library$/)

  // Closed with Done: the next back goes to Today, not a leftover entry.
  await page.getByRole('button', { name: /^Filters/ }).click()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()
  await page.goBack()
  await expect(page).toHaveURL(/#\/$/)
})

test('saving a guarded routine leaves no stray entry: Back goes where the builder came from', async ({ page }) => {
  await page.goto('/#/exercise/fs.bodyweight-squat')
  await dismissWelcome(page)
  await page.getByRole('button', { name: 'Add to a routine' }).click()
  await page.getByPlaceholder('Routine name').fill('Leg Day')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/#\/exercise\/fs\.bodyweight-squat$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
