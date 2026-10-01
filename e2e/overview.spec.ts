import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

async function startFullBodyA(page: Page): Promise<void> {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

// Taps a bottom-bar button once it's armed (ThumbBar ignores taps for a
// moment after its content changes), retrying until the tap lands and the
// button goes away.
async function armedTap(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true })
  for (let i = 0; i < 60; i++) {
    if ((await button.isVisible().catch(() => false)) && (await page.locator('[data-armed="true"]').isVisible().catch(() => false))) {
      await button.click({ force: true, timeout: 2_000 }).catch(() => {})
      await page.waitForTimeout(250)
      if (!(await button.isVisible().catch(() => false))) return
    }
    await page.waitForTimeout(150)
  }
  throw new Error(`could not tap ${name}`)
}

test('"1 of 5" opens the whole workout: done, now, skipped and up next', async ({ page }) => {
  await startFullBodyA(page)

  // Squat: both sets done. Push-up: skipped. Now on the glute bridge.
  for (let set = 0; set < 2; set++) {
    await armedTap(page, 'Complete Set')
    await armedTap(page, 'Yes')
    if (set === 0) await armedTap(page, 'Skip rest')
  }
  await armedTap(page, 'Skip rest')
  await expect(page.getByRole('heading', { name: 'Incline Push-Up' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip this move' }).click()
  await page.getByRole('dialog', { name: /Skip Incline Push-Up/ }).getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Single Leg Glute Bridge' })).toBeVisible()

  const opener = page.getByRole('button', { name: /Exercise 3 of 5\. See the whole workout/ })
  await expect(opener).toBeVisible()
  const box = await opener.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  await opener.click()

  const sheet = page.getByRole('dialog', { name: 'Workout overview' })
  await expect(sheet).toBeVisible()
  const rows = sheet.getByRole('listitem')
  await expect(rows).toHaveCount(5)
  await expect(rows.nth(0)).toContainText('Bodyweight Squat')
  await expect(rows.nth(0)).toContainText('2 of 2 sets')
  await expect(rows.nth(0)).toContainText('Done')
  await expect(rows.nth(1)).toContainText('Skipped')
  await expect(rows.nth(1)).toContainText('0 of 2 sets')
  await expect(rows.nth(2)).toHaveAttribute('aria-current', 'step')
  await expect(rows.nth(2)).toContainText('Now')
  await expect(rows.nth(3)).toContainText('Up next')

  // Close returns focus to the opener and leaves the workout untouched.
  await sheet.getByRole('button', { name: 'Back to the workout' }).click()
  await expect(sheet).toBeHidden()
  await expect(opener).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Single Leg Glute Bridge' })).toBeVisible()

  // The progress bar opens it too; Escape closes it.
  await page.getByRole('button', { name: 'See the whole workout', exact: true }).click()
  await expect(sheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
})
