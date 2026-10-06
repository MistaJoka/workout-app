import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

async function startFullBodyA(page: Page): Promise<void> {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

const stage = (page: Page) => page.locator('.tap-stage')

async function tapBar(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click({ force: true })
}

test('tapping Rae finishes the set, and never answers the rep question', async ({ page }) => {
  await startFullBodyA(page)
  await expect(stage(page)).toHaveAttribute('data-tappable', 'true')
  // Until she's used it once, a ring hints the stage is tappable.
  await expect(page.locator('.tap-stage-hint')).toBeAttached()

  await stage(page).click()
  await expect(page.getByText(/Did you complete all/)).toBeVisible()
  await expect(page.locator('.tap-stage-hint')).toHaveCount(0)

  // A second tap on the stage is not a "Yes".
  await expect(stage(page)).toHaveAttribute('data-tappable', 'false')
  await stage(page).click()
  await expect(page.getByText(/Did you complete all/)).toBeVisible()
  await expect(page.getByRole('timer')).toHaveCount(0)

  await tapBar(page, 'Yes')
  await expect(page.getByRole('timer')).toBeVisible()
})

test('the stage re-arms like the bar, so a double tap after rest logs nothing', async ({ page }) => {
  await startFullBodyA(page)
  await expect(stage(page)).toHaveAttribute('data-tappable', 'true')
  await stage(page).click()
  await tapBar(page, 'Yes')
  await expect(page.getByRole('timer')).toBeVisible()

  // The second half of a double tap on Skip rest: the page clicks the new
  // set's stage the moment it mounts, well inside its re-arm window.
  await page.evaluate(() => {
    const w = window as unknown as { stageTapWhenMounted?: string }
    new MutationObserver((_, observer) => {
      const el = document.querySelector<HTMLElement>('.tap-stage')
      if (!el) return
      observer.disconnect()
      w.stageTapWhenMounted = el.dataset.tappable
      el.click()
    }).observe(document.body, { childList: true, subtree: true })
  })
  await expect(async () => {
    await tapBar(page, 'Skip rest')
    await expect(page.getByRole('timer')).toHaveCount(0, { timeout: 1_000 })
  }).toPass({ timeout: 10_000 })
  await expect(page.getByText('Set 2 of 2', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { stageTapWhenMounted?: string }).stageTapWhenMounted)).toBe('false')
  await expect(page.getByText(/Did you complete all/)).toHaveCount(0)

  // Once armed, it works again; the hint stays gone.
  await expect(stage(page)).toHaveAttribute('data-tappable', 'true')
  await expect(page.locator('.tap-stage-hint')).toHaveCount(0)
  await stage(page).click()
  await expect(page.getByText(/Did you complete all/)).toBeVisible()
})
