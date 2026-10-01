import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

async function finishQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

// Every finished workout grows a flower of some species; the first of a
// kind is "new to your garden", and the garden collects them all.
test('a finished workout grows a named flower into the garden', async ({ page }) => {
  test.setTimeout(120_000)
  await finishQuick10(page)

  const reveal = page.getByRole('link', { name: /new to your garden\. Open your garden$/ })
  await expect(reveal).toBeVisible()
  await expect(page.getByText('New to your garden!')).toBeVisible()
  // Stats count up to their real values.
  await expect(page.getByText('moves', { exact: true })).toBeVisible()

  await reveal.click()
  await expect(page.getByRole('heading', { name: 'Your garden' })).toBeVisible()
  await expect(page.getByText('1 flower grown, 1 of 15 kinds found')).toBeVisible()
  await expect(page.getByRole('listitem', { name: /^Not found yet/ })).toHaveCount(14)
  await expect(page.getByRole('listitem', { name: /grown 1 time$/ })).toHaveCount(1)

  await page.goto('/#/progress')
  const card = page.getByRole('link', { name: /^Your garden: 1 flower, 1 of 15 kinds found/ })
  await expect(card).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(/#\/garden$/)
})

test('with motion off the species name is there at once', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await finishQuick10(page)
  await expect(page.getByText('New to your garden!')).toBeVisible({ timeout: 1_000 })
})
