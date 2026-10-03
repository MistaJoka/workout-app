import { expect, test, type Page } from '@playwright/test'

// Her wishlist end to end (domain/rewards/wishes.ts): she proposes a reward,
// Hubby Bunny prices it behind his PIN, and the reward lands in the shop
// marked as her wish. Once on the same phone, once across two phones
// (separate browser contexts) via a wish link and a gift link back.

async function stubShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __shares: unknown[] }).__shares = []
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (data: { title?: string; text?: string; url?: string }) => {
        ;(window as unknown as { __shares: unknown[] }).__shares.push({ title: data.title, text: data.text, url: data.url })
      },
      configurable: true,
    })
  })
}

async function lastShare(page: Page, countAtLeast: number): Promise<{ title?: string; text?: string; url?: string }> {
  await page.waitForFunction((n) => (window as unknown as { __shares: unknown[] }).__shares.length >= n, countAtLeast)
  return page.evaluate(() => {
    const shares = (window as unknown as { __shares: { title?: string; text?: string; url?: string }[] }).__shares
    return shares[shares.length - 1]
  })
}

async function setUpShopPin(page: Page): Promise<void> {
  await page.getByLabel('New PIN', { exact: true }).fill('4821')
  await page.getByLabel('Confirm PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Save PIN' }).click()
}

async function makeWish(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Make a wish ✨' }).click()
  await page.getByLabel('Wish', { exact: true }).fill(title)
  await page.getByRole('button', { name: 'Make a wish', exact: true }).click()
  await expect(page.getByTestId('wish-made')).toContainText(title)
}

test('same phone: she wishes, he prices it behind the PIN', async ({ page }) => {
  await stubShareSheet(page)
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await setUpShopPin(page)
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Lock' }).click()

  await makeWish(page, 'Spa day')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('wishlist')).toContainText('Spa day')
  await expect(page.getByTestId('wishlist')).toContainText('Waiting for Hubby Bunny')

  // Pricing it asks for his PIN.
  await page.getByRole('button', { name: 'Hubby: price Spa day' }).click()
  await page.getByLabel('PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByRole('button', { name: 'Big 150' }).click()
  await expect(page.getByTestId('wish-cost-in-workouts')).toHaveText('≈ 6 workouts')
  await page.getByRole('button', { name: 'Add to the shop' }).click()
  await expect(page.getByText('In the shop! ✨')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()

  // Granted: off the wishlist, in the shop, marked as her wish.
  await expect(page.getByTestId('wishlist')).not.toContainText('Spa day')
  await expect(page.getByText('✨ Your wish')).toBeVisible()
  await expect(page.getByText('150 🥕')).toBeVisible()
})

test('two phones: a wish link to him, a gift link back', async ({ page, browser, baseURL }) => {
  await stubShareSheet(page)
  await page.goto('/#/rewards')
  await makeWish(page, 'Pizza night')
  await page.getByRole('button', { name: /^Send to Hubby Bunny/ }).click()
  const wishShare = await lastShare(page, 1)
  expect(wishShare.text).toContain('Pizza night')
  expect(wishShare.url).toMatch(/#\/gift\?d=/)

  // His phone: open the wish, price it (first time: he sets his PIN).
  const hisContext = await browser.newContext({ baseURL })
  const his = await hisContext.newPage()
  await stubShareSheet(his)
  await his.goto(wishShare.url!.replace(/^https?:\/\/[^/]+/, ''))
  await expect(his.getByTestId('wish-preview')).toContainText('Pizza night')
  await his.getByRole('button', { name: 'Price it' }).click()
  await setUpShopPin(his)
  await his.getByRole('button', { name: 'Little 25' }).click()
  await his.getByRole('button', { name: 'Add to the shop' }).click()
  await his.getByRole('button', { name: /Send it back/ }).click()
  const giftShare = await lastShare(his, 1)
  expect(giftShare.url).toMatch(/#\/gift\?d=/)
  await hisContext.close()

  // Her phone: accept the gift; the wish is granted.
  await page.goto('about:blank')
  await page.goto(giftShare.url!.replace(/^https?:\/\/[^/]+/, ''))
  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page).toHaveURL(/#\/rewards/)
  await expect(page.getByText('✨ Your wish')).toBeVisible()
  await expect(page.getByTestId('wishlist')).not.toContainText('Pizza night')
})
