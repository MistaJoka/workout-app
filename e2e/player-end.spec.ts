import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

async function startFullBodyA(page: Page): Promise<void> {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

test('ending early asks first, then finishes on the Complete screen', async ({ page }) => {
  await startFullBodyA(page)
  await page.getByRole('button', { name: 'Complete Set' }).click()
  await page.getByRole('button', { name: 'Yes', exact: true }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Skip rest' }).click({ force: true })
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()

  // One tap only opens the question; "Keep going" leaves the workout as it was.
  await page.getByRole('button', { name: 'End workout' }).click()
  const sheet = page.getByRole('dialog', { name: 'End workout?' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Keep going' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()

  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()

  await expect(page.getByText('Workout complete')).toBeVisible()
  // Sets stat tile folds "N of M" into its own value, and marks an early
  // end in its label instead of a separate sentence (Complete rewrite).
  await expect(page.getByText('1/10')).toBeVisible()
  await expect(page.getByText(/ended early/)).toBeVisible()
  await page.getByRole('link', { name: 'See your progress' }).click()
  await expect(page.getByText('Full-Body A')).toBeVisible()
})

test('a paused workout can be ended from the pause screen', async ({ page }) => {
  await startFullBodyA(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Take your time')).toBeVisible()

  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()

  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect(page.getByText('0/10')).toBeVisible()
  await expect(page.getByText(/ended early/)).toBeVisible()
})
