import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// The rest of the shop R&D list (docs/rnd/hubby-shop/REWARD_SYSTEMS_RND.md):
// a shop either partner can run, his featured pick, the coupon unwrap, and
// a thank-you card sent back after a delivery.

async function stubShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __shares: unknown[] }).__shares = []
    Object.defineProperty(Navigator.prototype, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (data: { title?: string; text?: string; url?: string }) => {
        ;(window as unknown as { __shares: unknown[] }).__shares.push({ title: data.title, text: data.text, url: data.url })
      },
      configurable: true,
    })
  })
}

async function setUpShop(page: Page, giver?: string): Promise<void> {
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Set up shop' }).click()
  if (giver) await page.getByRole('button', { name: giver }).click()
  await page.getByLabel('New PIN', { exact: true }).fill('4821')
  await page.getByLabel('Confirm PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Save PIN' }).click()
}

test('a shop she runs on his phone reads as hers', async ({ page }) => {
  await setUpShop(page, 'Wifey Bunny')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('heading', { name: "Wifey Bunny's shop" })).toBeVisible()
  await expect(page.getByTestId('hubby-mode-pill')).toContainText('Wifey mode on')
  await page.getByRole('button', { name: 'Lock' }).click()
  await page.getByRole('button', { name: 'Manage shop' }).click()
  await expect(page.getByRole('dialog', { name: 'Enter the Wifey mode PIN' })).toBeVisible()

  await page.goto('/#/settings')
  await expect(page.getByRole('link', { name: "Wifey's reward shop" })).toBeVisible()
})

test('his featured pick leads the shop, with no countdown', async ({ page }) => {
  await setUpShop(page)
  await page.getByRole('button', { name: /No-dishes pass/ }).click()
  await page.getByRole('button', { name: '+ Add a reward' }).click()
  await page.getByLabel('Reward title').fill('Spa day')
  await page.getByRole('button', { name: 'Big 150' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: 'Feature Spa day' }).click()
  await expect(page.getByRole('button', { name: 'Feature Spa day' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  const featured = page.getByTestId('featured-reward')
  await expect(featured).toContainText("⭐ Hubby's pick")
  await expect(featured).toContainText('Spa day')
  // Featured first, even though it costs more.
  await expect(page.locator('.grid > .card').first()).toContainText('Spa day')
})

test('a fresh coupon unwraps, and a delivered one can be thanked', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000)
  await stubShareSheet(page)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await setUpShop(page)
  await page.getByRole('button', { name: /No-dishes pass/ }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Redeem' }).click()
  await page.getByRole('button', { name: /Redeem for 20/ }).click()

  // The wrap shows over the new coupon, then opens and gets out of the way.
  await expect(page.getByTestId('coupon-wrap')).toBeAttached()
  await expect(page.getByTestId('coupon-wrap')).toBeHidden({ timeout: 5000 })
  await expect(page.getByTestId('coupon-card')).toContainText('No-dishes pass')

  // Still in Hubby mode from setup: deliver, then she says thanks.
  await page.getByRole('button', { name: 'Hubby: mark delivered' }).click()
  await page.getByRole('button', { name: 'Say thanks 💕' }).click()
  await page.getByRole('button', { name: 'Best one yet 🥰' }).click()
  await page.getByRole('button', { name: /^Send to Hubby Bunny/ }).click()
  await page.waitForFunction(() => (window as unknown as { __shares: unknown[] }).__shares.length >= 1)
  const share = await page.evaluate(() => (window as unknown as { __shares: { text?: string; url?: string }[] }).__shares.at(-1)!)
  expect(share.text).toContain('Best one yet 🥰')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Thanked 💕')).toBeVisible()

  // His phone: the link opens a thank-you card.
  const his = await (await browser.newContext({ baseURL })).newPage()
  await his.goto(share.url!.replace(/^https?:\/\/[^/]+/, ''))
  await expect(his.getByTestId('thanks-card')).toContainText('Best one yet 🥰')
  await expect(his.getByTestId('thanks-card')).toContainText('No-dishes pass')
  // A thank-you is only a card to look at: no "open in the app" notice.
  await expect(his.getByTestId('open-in-app')).toHaveCount(0)
  await his.context().close()
})
