import { expect, test, type Locator } from '@playwright/test'
import { dismissWelcome } from './helpers'

// One-finger use: every tap target is at least 44x44 CSS px, found too
// small on her Flip 7 (main 412px wide, cover 360px).

async function atLeast44(target: Locator): Promise<void> {
  const box = (await target.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)
}

test.describe('main screen', () => {
  test.use({ viewport: { width: 412, height: 915 } })

  test("the Start screen's safety More link and the lb/kg chips", async ({ page }) => {
    await page.goto('/#/checkin/fs.full-body-a')
    await dismissWelcome(page)
    await atLeast44(page.getByRole('link', { name: 'More', exact: true }))
    await page.goto('/#/settings')
    await atLeast44(page.getByRole('button', { name: 'lb', exact: true }))
    await atLeast44(page.getByRole('button', { name: 'kg', exact: true }))
  })
})

test.describe('cover screen', () => {
  test.use({ viewport: { width: 360, height: 380 } })

  test("the week's pots", async ({ page }) => {
    await page.goto('/')
    await dismissWelcome(page)
    const days = page.locator('.week-blooms ol > li > :is(a, button)')
    await expect(days).toHaveCount(7)
    for (const day of await days.all()) await atLeast44(day)
  })
})
