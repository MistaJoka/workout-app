import { expect, test } from '@playwright/test'

// The Start screen's moves open their detail, and Back returns to Start
// (not Today), so a move can be checked before starting.
test('a move on the Start screen opens its detail, and Back returns to Start', async ({ page }) => {
  await page.goto('/#/')
  await page.goto('/#/checkin/fs.full-body-a')
  const list = page.getByRole('list', { name: 'Your workout' })
  await list.getByRole('link', { name: /Incline Push-Up/ }).click()
  await expect(page.getByRole('heading', { name: 'Incline Push-Up' })).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Full-Body A' })).toBeVisible()
})

test('the Up first preview opens the opening move', async ({ page }) => {
  await page.goto('/#/')
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('link', { name: 'About Bodyweight Squat' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()
})

test('move rows are at least 44px tall', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  const row = page.getByRole('list', { name: 'Your workout' }).getByRole('link').first()
  const box = await row.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
})
