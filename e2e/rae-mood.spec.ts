import { expect, test, type Page } from '@playwright/test'

// Rae's small face in the player reacts to what's happening (raeMood.ts):
// focused mid-set, a brief laugh right after a counted set, settling to a
// tired/breathing face during rest, and a cheer on the last set. It's
// flavor — aria-hidden — so these checks read the decorative
// data-expression attribute the face always carries, not its name.

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

// A forced click a bar's arm window can swallow; retried like
// e2e/helpers.ts's finishWorkout and player-juice.spec.ts's armedTap.
async function armedTap(page: Page, name: string): Promise<boolean> {
  const button = page.getByRole('button', { name, exact: true })
  if (!(await button.isVisible().catch(() => false))) return false
  if (!(await page.locator('[data-armed="true"]').isVisible().catch(() => false))) return false
  try {
    await button.click({ timeout: 2_000, force: true })
    return true
  } catch {
    return false
  }
}

test('the header face is focused mid-set, laughs right after a counted set, then settles tired at rest', async ({
  page,
}) => {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()

  const headerFace = page.getByTestId('rae-player-face')
  await expect(headerFace).toHaveAttribute('data-expression', 'focused')
  await expect(headerFace).toHaveAttribute('aria-hidden', 'true')
  await expect(headerFace).toHaveAttribute('alt', '')

  // First set (run 1, no flow milestone): Complete Set -> Yes moves straight
  // into rest, where the just-finished-set reaction is actually visible.
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')

  const restFace = page.getByTestId('rae-rest-face')
  await expect(restFace).toHaveAttribute('data-expression', 'laugh', { timeout: 1_000 })
  await expect(restFace).toHaveAttribute('aria-hidden', 'true')

  // Once the brief reaction window (raeMood.ts's CELEBRATE_MS) passes, the
  // rest view settles to its own breathing face.
  await expect(restFace).toHaveAttribute('data-expression', 'tired', { timeout: 3_000 })
})

test('the header face cheers on the last set of the workout', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()

  for (let i = 0; i < 300; i++) {
    if (await page.getByText('Last set!', { exact: true }).isVisible().catch(() => false)) break
    if (await armedTap(page, 'Skip rest')) continue
    if (await armedTap(page, 'Yes')) continue
    if (await page.getByText('Last set!', { exact: true }).waitFor({ timeout: 600 }).then(() => true, () => false)) break
    if (await armedTap(page, 'Complete Set')) continue
    await page.waitForTimeout(150)
  }
  await expect(page.getByText('Last set!', { exact: true })).toBeVisible()
  await expect(page.getByTestId('rae-player-face')).toHaveAttribute('data-expression', 'cheer')
})

test('a paused workout shows a calm face, decorative like the rest', async ({ page }) => {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()

  const pausedFace = page.getByTestId('rae-paused-face')
  await expect(pausedFace).toHaveAttribute('data-expression', 'smile')
  await expect(pausedFace).toHaveAttribute('aria-hidden', 'true')
})
