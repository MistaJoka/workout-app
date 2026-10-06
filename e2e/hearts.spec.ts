import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

test('hearting a move marks it and filters the Library to hearted moves', async ({ page }) => {
  await page.goto('/#/exercise/fs.plank')
  await dismissWelcome(page)
  await page.getByRole('button', { name: 'Heart Plank' }).click()
  await expect(page.getByRole('button', { name: 'Un-heart Plank' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('about:blank')
  await page.goto('/#/library')
  await page.getByRole('button', { name: /^Hearted moves only/ }).click()
  await expect(page.getByText('1 exercise', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Plank/ })).toBeVisible()

  // Taking the heart back empties the filter's source.
  await page.goto('about:blank')
  await page.goto('/#/exercise/fs.plank')
  await page.getByRole('button', { name: 'Un-heart Plank' }).click()
  await expect(page.getByRole('button', { name: 'Heart Plank' })).toHaveAttribute('aria-pressed', 'false')
  await page.goto('about:blank')
  await page.goto('/#/library')
  await expect(page.getByText(/exercises/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Hearted moves only/ })).toHaveCount(0)
})
