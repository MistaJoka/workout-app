import { expect, test, type Page } from '@playwright/test'

// Completing a set feels like something: a petal burst (full motion only),
// the dot and bar fill, and the finish line named as it gets close. None of
// it may slow the next tap.

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

// Taps a forced click can lose during the bar's arm window are retried, as
// in helpers.finishWorkout.
async function completeOneSet(page: Page): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole('button', { name: 'Skip rest', exact: true }).isVisible().catch(() => false)) return
    if (await armedTap(page, 'Yes')) continue
    if (await armedTap(page, 'Complete Set')) continue
    await page.waitForTimeout(100)
  }
}

// Counts bursts as they're added to <body> (each lives under a second).
async function countBursts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __bursts: number; __burstObserver: MutationObserver }
    w.__bursts = 0
    // Held on window: an unreferenced observer can be garbage-collected.
    w.__burstObserver = new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) if (n instanceof HTMLElement && n.dataset.testid === 'set-burst') w.__bursts++
    })
    // `document`, not documentElement: at init-script time the root element
    // isn't the one the page ends up with.
    w.__burstObserver.observe(document, { childList: true, subtree: true })
  })
}
const bursts = (page: Page) => page.evaluate(() => (window as unknown as { __bursts: number }).__bursts)

test('a completed set bursts petals without slowing the next tap', async ({ page }) => {
  await countBursts(page)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await completeOneSet(page)
  // The rest screen is there at once; the burst is decoration on <body>
  // that cleans itself up.
  await expect(page.getByRole('button', { name: 'Skip rest', exact: true })).toBeVisible()
  await expect.poll(() => bursts(page)).toBe(1)
  await expect(page.locator('[data-testid="set-burst"]')).toHaveCount(0, { timeout: 3_000 })
})

test('the last set is named as the finish line gets close', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  for (let i = 0; i < 300; i++) {
    if (await page.getByText('Last set!', { exact: true }).isVisible().catch(() => false)) break
    if (await armedTap(page, 'Skip rest')) continue
    if (await armedTap(page, 'Yes')) continue
    if (await armedTap(page, 'Complete Set')) continue
    await page.waitForTimeout(150)
  }
  await expect(page.getByText('Last set!', { exact: true })).toBeVisible()
  await expect(page.getByText('Last move', { exact: true })).toBeHidden()
})

test('with animations off, a set completes with no burst', async ({ page }) => {
  await countBursts(page)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await completeOneSet(page)
  await expect(page.getByRole('button', { name: 'Skip rest', exact: true })).toBeVisible()
  expect(await bursts(page)).toBe(0)
})
