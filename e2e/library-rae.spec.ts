import { expect, test } from '@playwright/test'

test.describe('library: Rae first', () => {
  test('the list leads with moves Rae demonstrates, and "Rae demos" narrows to them', async ({ page }) => {
    await page.goto('/#/library')
    const rows = page.locator('ul > li a')
    await expect(rows.first()).toBeVisible()

    // The first row is a Rae move (her thumbnail is pixel art, not a photo).
    await expect(rows.first().locator('img.pixelated')).toHaveCount(1)

    const toggle = page.getByRole('button', { name: /^Rae demos \(\d+\)$/ })
    const label = (await toggle.textContent()) ?? ''
    const count = Number(label.match(/\((\d+)\)/)?.[1])
    expect(count).toBeGreaterThan(0)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(`${count} exercises`)).toBeVisible()
    // Every visible row now shows Rae.
    const visible = await rows.count()
    for (let i = 0; i < visible; i++) await expect(rows.nth(i).locator('img.pixelated')).toHaveCount(1)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('search results also lead with Rae', async ({ page }) => {
    await page.goto('/#/library')
    await page.getByPlaceholder('Search exercises').fill('squat')
    await expect(page.getByText('8 exercises')).toBeVisible()
    await expect(page.locator('ul > li a').first().locator('img.pixelated')).toHaveCount(1)
  })
})
