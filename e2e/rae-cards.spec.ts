import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 384, height: 824 } })

test("a card move shows Rae's loop and the owner's how-to card", async ({ page }) => {
  await page.goto('/#/exercise/rae.clamshell')
  await expect(page.getByRole('heading', { name: 'Clamshell' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Rae doing a clamshell/ }).or(page.getByRole('img', { name: /^clamshell, frame/ })).first()).toBeVisible()
  const card = page.getByRole('img', { name: 'Clamshell how-to card' })
  await card.scrollIntoViewIfNeeded()
  await expect(card).toBeVisible()
  expect(await card.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
})

test('a library move the cards attach to shows its card too', async ({ page }) => {
  await page.goto('/#/exercise/lib.Reverse_Crunch')
  await expect(page.getByRole('img', { name: 'Reverse Crunch how-to card' })).toBeVisible()
})

test('a move without a card shows none', async ({ page }) => {
  await page.goto('/#/exercise/fs.bodyweight-squat')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: /how-to card$/ })).toHaveCount(0)
})
