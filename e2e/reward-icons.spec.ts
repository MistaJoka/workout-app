import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

test.use({ viewport: { width: 384, height: 824 } })

async function loaded(page: Page, selector: string) {
  const img = page.locator(selector).first()
  await expect(img).toBeVisible()
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
}

test('a reward picked by its icon shows that icon in the shop, on Today and on its coupon', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await page.getByLabel('New PIN', { exact: true }).fill('4821')
  await page.getByLabel('Confirm PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Save PIN' }).click()

  // One tap on the icon fills in the name and the price.
  await page.getByRole('button', { name: '+ Add a reward' }).click()
  await page.getByRole('group', { name: 'Reward icons' }).getByRole('button', { name: 'Pizza night' }).click()
  await expect(page.getByLabel('Reward title')).toHaveValue('Pizza night')
  await expect(page.getByText('40 🥕')).toBeVisible()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await loaded(page, 'img[src*="rewards/pizza.webp"]')

  // Saving for it (offered while it's out of reach): the icon is on the
  // shop's goal card and Today's tile.
  await page.getByRole('button', { name: 'Save for this' }).first().click()
  await loaded(page, '[data-testid="saving-goal"] img[src*="rewards/pizza"]')
  await page.goto('/#/')
  await loaded(page, 'a[aria-label^="Saving for Pizza night"] img[src*="rewards/pizza"]')

  // Two workouts' carrots, enough for the 40-carrot pizza night.
  for (let i = 0; i < 2; i++) {
    await page.goto('about:blank')
    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)
  }

  // Redeem it: the coupon shows the icon's tile.
  await page.goto('about:blank')
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Redeem' }).first().click()
  await page.getByRole('button', { name: /Redeem for 40/ }).click()
  await loaded(page, '[data-testid="coupon-card"] img[src*="rewards/pizza-tile.webp"]')
})

test('her wish made with an icon keeps it', async ({ page }) => {
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: /Make a wish/ }).first().click()
  await page.getByRole('group', { name: 'Wish icons' }).getByRole('button', { name: 'Boba run' }).click()
  await expect(page.getByLabel('Wish', { exact: true })).toHaveValue('Boba run')
  await page.getByRole('button', { name: 'Make a wish', exact: true }).click()
  await loaded(page, '[data-testid="wish-made"] img[src*="rewards/boba"]')
})
