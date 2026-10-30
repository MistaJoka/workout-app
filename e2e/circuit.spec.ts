import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

// A circuit routine: one set of each move in turn, round after round.
async function completeSet(page: Page) {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Complete Set', exact: true }).click()
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Yes', exact: true }).click()
  await expect(page.getByRole('timer')).toBeVisible()
}

async function skipRest(page: Page) {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Skip rest', exact: true }).click()
}

test('build a circuit, then run it move by move, round by round', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await dismissWelcome(page)
  await page.goto('/#/routines/new')
  await page.getByPlaceholder('Routine name').fill('Living room')
  await page.getByRole('radio', { name: 'Circuit' }).click()
  // Rounds replace per-move sets and rests.
  await expect(page.getByText('Rounds')).toBeVisible()
  await page.getByRole('button', { name: 'Decrease Rounds' }).click()
  for (const move of [/Mini Squat/, /Push/]) {
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder('Search exercises').fill(move.source.replace(/\\/g, ''))
    await page.getByRole('button', { name: move }).first().click()
  }
  await expect(page.getByText('Sets', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.getByRole('heading', { name: 'Living room' })).toBeVisible()
  await expect(page.getByText(/^2 moves, circuit × 2, about \d+ min$/)).toBeVisible()

  await page.getByRole('link', { name: 'Start workout' }).click()
  await expect(page.getByText(/2 moves, 2 rounds/)).toBeVisible()
  await page.getByRole('button', { name: 'Start workout' }).click()

  // The move's own name, not the start overlay's routine heading.
  await expect(page.getByText('Round 1 of 2')).toBeVisible()
  const moveName = page.locator('.player-target h2')
  await expect(moveName).toBeVisible()
  const first = (await moveName.textContent())?.trim() ?? ''
  await completeSet(page)
  // Up next is the second move, still round 1.
  await expect(page.getByText('Round 1 of 2')).toBeVisible()
  await skipRest(page)
  await expect(moveName).not.toHaveText(first)
  const second = (await moveName.textContent())?.trim() ?? ''
  expect(second).not.toBe(first)
  await completeSet(page)
  await skipRest(page)
  // Back to the first move for round 2.
  await expect(moveName).toHaveText(first)
  await expect(page.getByText('Round 2 of 2')).toBeVisible()
  await finishWorkout(page)
  await expect(page.getByText('4/4')).toBeVisible()
})
