import { expect, type Page } from '@playwright/test'

// Drives a started workout to the Complete screen: answers "Yes" to every
// rep check, completes timed sets, and skips every rest. Taps only once the
// bottom bar is armed (see ThumbBar). Buttons are
// briefly disabled while an action persists and the rest view re-renders
// every 250ms, so each click gets a short budget and the loop simply
// re-reads the screen if a click didn't land.
export async function finishWorkout(page: Page): Promise<void> {
  const tap = async (name: string): Promise<boolean> => {
    const button = page.getByRole('button', { name, exact: true })
    if (!(await button.isVisible().catch(() => false))) return false
    // The bottom bar ignores taps for a moment after it changes (ThumbBar);
    // a forced click during that window lands on the page beneath.
    if (!(await page.locator('[data-armed="true"]').isVisible().catch(() => false))) return false
    try {
      await button.click({ timeout: 3_000, force: true })
      return true
    } catch {
      return false
    }
  }
  // Budget: ~0.7s arm window per bar change, three changes per set.
  for (let i = 0; i < 500; i++) {
    if (await page.getByText('Workout complete').isVisible().catch(() => false)) return
    if (await tap('Skip rest')) continue
    if (await tap('Yes')) continue
    if (await tap('Complete Set')) continue
    // A timed hold's own way to log a set timed by hand.
    if (await tap('Already did it')) continue
    await page.waitForTimeout(150)
  }
  await expect(page.getByText('Workout complete')).toBeVisible()
}

// Complete keeps its reward moments (badges, boss hit, love note, bests,
// goal met) in one sheet behind the "+N rewards" button; open it before
// reaching for them.
export async function openCompleteRewards(page: Page): Promise<void> {
  const sheet = page.getByRole('dialog', { name: 'Your rewards' })
  if (await sheet.isVisible().catch(() => false)) return
  await page.getByTestId('complete-more').click()
  await expect(sheet).toBeVisible()
}

export async function dismissWelcome(page: Page): Promise<void> {
  const gotIt = page.getByRole('button', { name: 'Got it' })
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click()
}

// Progress keeps its details (history, bests, body weight, 8-week chart)
// behind one closed "More"; open it before reaching for them.
export async function openProgressMore(page: Page): Promise<void> {
  const more = page.getByTestId('progress-more')
  await more.waitFor()
  if (!(await more.evaluate((el) => (el as HTMLDetailsElement).open))) await more.getByText('More', { exact: true }).click()
}
