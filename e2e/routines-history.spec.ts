import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

test.describe('routines and history', () => {
  test('add a move to an existing routine, run it, and read the workout back from Progress', async ({ page }) => {
    test.setTimeout(120_000)

    // No routines yet: "Add to a routine" goes straight to a new one.
    await page.goto('/#/exercise/fs.bodyweight-squat')
    await page.getByRole('button', { name: 'Add to a routine' }).click()
    await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
    await page.getByPlaceholder('Routine name').fill('Leg Day')
    await page.getByRole('button', { name: 'Decrease Sets' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()

    // With a routine, the sheet offers it, and picking it appends the move.
    await page.goto('/#/exercise/fs.incline-push-up')
    await page.getByRole('button', { name: 'Add to a routine' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add to a routine' })
    await sheet.getByRole('button', { name: /Leg Day/ }).click()
    await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('Added Incline Push-Up')
    await expect(page.getByText('2 × 10')).toBeVisible()
    await expect(page.getByText('3 × 10')).toBeVisible()

    // A move already in the routine can't be added twice.
    await page.goto('/#/exercise/fs.bodyweight-squat')
    await page.getByRole('button', { name: 'Add to a routine' }).click()
    await expect(page.getByRole('dialog', { name: 'Add to a routine' }).getByRole('button', { name: /Leg Day/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Run the routine, then open it from Progress history.
    await page.goto('/#/')
    // Today's routine link goes straight to the start screen.
    await page.getByRole('link', { name: /Leg Day/ }).first().click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)

    await page.getByRole('link', { name: 'Progress' }).click()
    await page.getByRole('link', { name: /Leg Day/ }).click()
    await expect(page.getByRole('heading', { name: 'Leg Day' })).toBeVisible()
    await expect(page.getByText('2/2 sets')).toBeVisible()
    await expect(page.getByText('3/3 sets')).toBeVisible()
    await expect(page.getByText(/min$/)).toBeVisible()
    await expect(page.locator('ol > li').filter({ hasText: '10, done' })).toHaveCount(5)
  })

  test('a body-weight entry can be deleted', async ({ page }) => {
    await page.goto('/#/progress')
    await page.getByRole('button', { name: 'Log body weight' }).click()
    await page.getByRole('button', { name: 'Save today' }).click()
    await expect(page.getByRole('button', { name: 'Log today' })).toBeVisible()

    await page.getByText('Past entries').click()
    await page.getByRole('button', { name: /^Delete / }).click()
    const sheet = page.getByRole('dialog', { name: 'Delete this weigh-in?' })
    await sheet.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Not logged yet.')).toBeVisible()
    await expect(page.getByText('Past entries')).toBeHidden()
  })

  test('leaving an unsaved routine through the tab bar asks first', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Half done')

    await page.getByRole('link', { name: 'Library' }).click()
    const sheet = page.getByRole('dialog', { name: 'Leave without saving?' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
    await expect(page.getByPlaceholder('Routine name')).toHaveValue('Half done')

    await page.getByRole('link', { name: 'Library' }).click()
    await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave' }).click()
    await expect(page.getByPlaceholder('Search exercises')).toBeVisible()

    // Nothing unsaved: tabs just go.
    await page.getByRole('link', { name: 'Progress' }).click()
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
  })
})
