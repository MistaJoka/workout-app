import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

async function runQuick10(page: import('@playwright/test').Page) {
  await page.goto('about:blank')
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

// Complete calls out milestones and new personal bests, judged only against
// earlier sessions. A first-ever move is not a "best".
test('first workout is a milestone; beating an earlier session shows a new best', async ({ page }) => {
  test.setTimeout(150_000)

  await runQuick10(page)
  const highlights = page.getByRole('list', { name: 'Highlights' })
  await expect(highlights.getByText('Your first workout!')).toBeVisible()
  await expect(highlights.getByText(/^New best:/)).toHaveCount(0)

  // A clean Quick 10 steps squat reps up within range (10 → 12), so the
  // second run beats the first.
  await runQuick10(page)
  await expect(page.getByRole('list', { name: 'Highlights' }).getByText(/^New best: .+ reps/)).toBeVisible()
  await expect(page.getByText('Your first workout!')).toHaveCount(0)
})
