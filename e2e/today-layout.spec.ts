import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 384, height: 824 } })

test('a workout day: Rae demonstrates the first move in her room', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.rae-room').getByRole('img', { name: /^Rae doing a / })).toBeVisible()
})

// Text a sighted person sees: screen-reader-only spans removed.
async function seenText(page: import('@playwright/test').Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.sr-only').forEach((n) => n.remove())
    return copy.textContent ?? ''
  })
}

test('the mission and week cards show numbers, not sentences', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()
  const mission = await seenText(page, '.today-mission')
  expect(mission).toMatch(/⏱\s*\d+ min/)
  expect(mission).not.toMatch(/exercises, about/)
  const week = await seenText(page, '.week-blooms')
  expect(week).not.toMatch(/to hit your week|to your \d+(st|nd|rd|th) workout/)
})

test('the ready Today fits one phone screen', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('link', { name: 'Start workout' })
  await expect(start).toBeVisible()
  const box = await start.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(824 - 72) // above the tab bar
  // The other workouts are a swipe row of tiles, not a text list.
  await expect(page.getByRole('list', { name: 'Or pick another' }).getByRole('link', { name: /^Full-Body B, / })).toBeVisible()
})

test('no sideways page scroll at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
