import { expect, test, type Page } from '@playwright/test'

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

test('a short set is logged with one tap on a quick pick', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'No, fell short')

  // Target is 10: one, two and three short are offered, plus Other.
  await expect(page.getByText('How many reps?')).toBeVisible()
  for (const n of [9, 8, 7]) await expect(page.getByRole('button', { name: `${n} reps`, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Other', exact: true })).toBeVisible()
  const pick = page.getByRole('button', { name: '9 reps', exact: true })
  expect((await pick.boundingBox())!.height).toBeGreaterThanOrEqual(44)

  await tapArmed(page, '7 reps')
  await expect(page.getByText('Rest', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'End workout' }).click()
  await page.getByRole('dialog', { name: 'End workout?' }).getByRole('button', { name: 'End workout' }).click()
  await expect(page.getByText('Workout complete')).toBeVisible()

  await page.goto('/#/progress')
  await page.getByRole('link', { name: /Full-Body A/ }).click()
  await expect(page.locator('ol > li').filter({ hasText: '7, missed' })).toHaveCount(1)
})
