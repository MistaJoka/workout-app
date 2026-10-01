import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

async function startQuick10(page: Page) {
  await page.goto('about:blank')
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
}

// A clean Quick 10 run auto-steps the bodyweight squat's reps from 10 to 12
// for the next session (ADJUSTED_WITHIN_BOUNDS, no confirmation needed —
// see complete-bests.spec.ts). The second session's squat target (12) then
// strictly beats the first session's prior best (10 reps, every set met),
// so the player should flag it before the set and celebrate it after.
test('a target that now beats a past best shows the live-best chip, then New best! on the set', async ({ page }) => {
  test.setTimeout(150_000)

  // Seed a prior finished session: a full Quick 10, every set met.
  await startQuick10(page)
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await expect(page.getByText('Set 1 of 2')).toBeVisible()
  await finishWorkout(page)
  await expect(page.getByText('Workout complete')).toBeVisible()

  // Second session: the squat now targets 12 reps, which beats the 10-rep
  // prior best outright.
  await startQuick10(page)
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
  await expect(page.getByText('Set 1 of 2')).toBeVisible()

  const chip = page.getByTestId('live-best-chip')
  await expect(chip).toBeVisible()
  await expect(chip).toHaveText('New best if you finish!')

  // Finishing the set (a full "Yes", performed reps = the prescribed 12)
  // beats the prior best of 10 — the toast fires once, near the big number,
  // and announces itself (role="status").
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  const toast = page.getByTestId('new-best-burst')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveText('New best!')
  await expect(toast).toHaveAttribute('role', 'status')

  // Past the rest screen to the second set of the same move: the chip still
  // previews the same target against the same prior best, but finishing it
  // fires no second toast (once per exercise per session).
  await tapArmed(page, 'Skip rest')
  await expect(page.getByText('Set 2 of 2')).toBeVisible()
  await expect(page.getByTestId('live-best-chip')).toBeVisible()
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await expect(page.getByTestId('new-best-burst')).toHaveCount(0)
})
