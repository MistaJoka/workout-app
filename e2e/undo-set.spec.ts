import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

async function startFullBodyA(page: Page): Promise<void> {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

// Taps a thumb-bar button once the bar has armed (ThumbBar ignores taps for
// a moment after its content changes).
async function tapBar(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click({ force: true })
}

test('a mis-tapped set is undone from the rest screen and counts nowhere', async ({ page }) => {
  await startFullBodyA(page)
  await tapBar(page, 'Complete Set')
  await tapBar(page, 'Yes')
  await expect(page.getByRole('timer')).toBeVisible()

  await page.getByRole('button', { name: '↶ Undo last set' }).click()
  await expect(page.getByRole('timer')).toBeHidden()
  await expect(page.getByText('Set 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText(/Set undone/)).toBeAttached()

  // Do it for real, then end: only the real set counts.
  await tapBar(page, 'Complete Set')
  await tapBar(page, 'Yes')
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()
  await expect(page.getByText('1 of 10 sets completed (ended early)')).toBeVisible()
})

test('the undo is gone once the rest is over', async ({ page }) => {
  await startFullBodyA(page)
  await tapBar(page, 'Complete Set')
  await tapBar(page, 'Yes')
  await tapBar(page, 'Skip rest')
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
  await expect(page.getByRole('button', { name: '↶ Undo last set' })).toHaveCount(0)
})

test('the rep check can be backed out of before anything is saved', async ({ page }) => {
  await startFullBodyA(page)
  await tapBar(page, 'Complete Set')
  await expect(page.getByText(/Did you complete all/)).toBeVisible()
  await page.getByRole('button', { name: 'Undo, back to the set' }).click()
  await expect(page.getByText(/Did you complete all/)).toBeHidden()
  await expect(page.getByRole('button', { name: 'Complete Set', exact: true })).toBeVisible()
  await expect(page.getByText('Set 1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveCount(0)
})
