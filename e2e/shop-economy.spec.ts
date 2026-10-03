import { expect, test } from '@playwright/test'

// Hubby Bunny's shop economy: starter prices span little treats to a big
// dream, the editor tells a price in workouts with one-tap tier prices, the
// shop groups rewards by tier, and she can pin one reward to save for, with
// a progress bar on the shop and on Today.
test('tiers, prices in workouts, and saving for a big reward', async ({ page }) => {
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await page.getByLabel('New PIN', { exact: true }).fill('4821')
  await page.getByLabel('Confirm PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Save PIN' }).click()

  // Two starter ideas, one little and one big.
  await page.getByRole('button', { name: /No-dishes pass/ }).click()
  await expect(page.getByText('No-dishes pass').first()).toBeVisible()
  await page.getByRole('button', { name: '+ Add a reward' }).click()
  await page.getByRole('button', { name: 'Big 150' }).click()
  await expect(page.getByTestId('cost-in-workouts')).toHaveText('≈ 6 workouts')
  await page.getByRole('button', { name: 'Little 25' }).click()
  await expect(page.getByTestId('cost-in-workouts')).toHaveText('≈ 1 workout')
  await page.getByRole('button', { name: 'Big 150' }).click()
  await page.getByLabel('Reward title').fill('Spa day')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // Grouped by tier, cheapest first.
  await expect(page.getByText('Little treats')).toBeVisible()
  await expect(page.getByText('Big dreams')).toBeVisible()

  // Save for the big one: a goal card appears, and on Today too.
  await page.getByRole('button', { name: 'Save for this' }).last().click()
  await expect(page.getByTestId('saving-goal')).toContainText('Spa day')
  await expect(page.getByRole('progressbar', { name: 'Saving for Spa day: 0 of 150 carrots' }).first()).toBeVisible()
  await expect(page.getByTestId('saving-goal')).toContainText('about 6 workouts to go')
  await expect(page.getByRole('button', { name: 'Saving ⭐' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/#/')
  await expect(page.getByTestId('saving-goal-today')).toContainText('Spa day')
  await page.getByTestId('saving-goal-today').click()
  await expect(page).toHaveURL(/#\/rewards/)

  // Tap again to stop saving for it; the goal card goes away.
  await page.getByRole('button', { name: 'Saving ⭐' }).click()
  await expect(page.getByTestId('saving-goal')).toHaveCount(0)
})
