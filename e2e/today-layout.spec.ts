import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 384, height: 824 } })

test('a workout day: Rae demonstrates the first move in her room', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.rae-room').getByRole('img', { name: /^Rae doing a / })).toBeVisible()
})
