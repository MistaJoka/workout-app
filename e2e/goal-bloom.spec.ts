import { expect, test } from '@playwright/test'
import { goalSpeciesFor, weekStartKey } from '../src/domain/progress/goalBloom'
import { finishWorkout } from './helpers'

// Goal bloom: the week the default weekly goal (2) is met, the second
// workout also earns a bonus flower from its own rarer pool
// (goalBloom.ts), revealed on Complete next to the "Goal met!" banner, and
// marked with a small ribbon wherever it shows up in the garden.

async function finishQuick10(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

test('the workout that meets the week goal reveals a bonus goal bloom on Complete, marked in the garden', async ({
  page,
}) => {
  test.setTimeout(180_000)
  // A Wednesday at noon: both workouts land in the same Monday-start week.
  const now = new Date(2026, 8, 30, 12, 0, 0)
  await page.clock.install({ time: now })
  const weekStart = weekStartKey(now)
  const species = goalSpeciesFor(weekStart)
  const article = /^[aeiou]/i.test(species.name) ? 'An' : 'A'

  // First workout this week: no goal met yet, no goal bloom.
  await finishQuick10(page)
  await expect(page.getByTestId('goal-met')).toHaveCount(0)
  await expect(page.getByTestId('goal-bloom-reveal')).toHaveCount(0)
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('link', { name: 'Back to Today' }).click()

  // Second workout reaches the default goal of 2: the bonus bloom reveals
  // right alongside the goal-met banner, never before it.
  await finishQuick10(page)
  const goalMet = page.getByTestId('goal-met')
  const bloomReveal = page.getByTestId('goal-bloom-reveal')
  await expect(goalMet).toBeVisible()
  await expect(bloomReveal).toBeVisible()
  await expect(bloomReveal.locator('p')).toHaveText(`Goal bloom! ${article} ${species.name} for your week`)
  // The reveal sits in the same rewards card as the goal-met banner, not a
  // separate block somewhere else on the screen.
  const rewardsCard = page.getByRole('region', { name: 'Rewards' })
  await expect(rewardsCard.getByTestId('goal-bloom-reveal')).toBeVisible()

  // The garden now holds three flowers: two ordinary ones plus the bonus.
  await page.goto('/#/garden')
  await expect(page.getByText(/^3 flowers grown/)).toBeVisible()

  // The bonus flower is marked with a small ribbon in the meadow, and nothing else is.
  const goalFlowers = page.locator('[data-testid="meadow-flower"][data-goal-bloom="true"]')
  await expect(goalFlowers).toHaveCount(1)
  await expect(goalFlowers.first()).toHaveAttribute('aria-label', new RegExp('a goal bloom grown by meeting your weekly goal'))

  // Its species tile in the collection grid opens a lore card naming the
  // goal as how it was grown.
  const tile = page.getByRole('listitem', { name: new RegExp(`^${species.name}, `) })
  await tile.getByRole('button').click()
  const sheet = page.getByTestId('lore-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Grown by meeting your weekly goal')).toBeVisible()

  // Progress counts the bonus flower too: same flower total as the garden.
  await page.goto('/#/progress')
  await expect(page.getByRole('link', { name: /^Your garden: 3 flowers, / })).toBeVisible()
})

test('with motion off, the goal bloom reveal is still there at once', async ({ page }) => {
  test.setTimeout(180_000)
  const now = new Date(2026, 8, 30, 12, 0, 0)
  await page.clock.install({ time: now })
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()

  await finishQuick10(page)
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('link', { name: 'Back to Today' }).click()

  await finishQuick10(page)
  await expect(page.getByTestId('goal-bloom-reveal')).toBeVisible({ timeout: 1_000 })
})
