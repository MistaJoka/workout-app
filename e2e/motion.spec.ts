import { expect, test, type Page } from '@playwright/test'

// Route and sheet entrances (index.css "Motion polish") must never block a
// tap, and the Animations setting must switch them: On animates, Less
// fades only, Off has none.

async function setAnimations(page: Page, label: 'On' | 'Less' | 'Off') {
  await page.goto('/#/about')
  await page.getByRole('button', { name: label, exact: true }).click()
}

function animationOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { name: s.animationName, duration: parseFloat(s.animationDuration) }
  })
}

test('a screen is tappable the instant it appears', async ({ page }) => {
  await page.goto('/#/')
  // No waiting after navigation: the routine link must take the tap at once.
  await page.getByRole('link', { name: 'Library' }).click()
  await page.getByRole('link', { name: /Full-Body A/ }).first().click({ timeout: 1_000 })
  await expect(page.getByRole('heading', { name: 'Full-Body A' })).toBeVisible()
})

test('a sheet takes a tap mid-slide, and a forced tap still lands', async ({ page }) => {
  await page.goto('/#/routines/new')
  await page.getByPlaceholder('Routine name').fill('Half done')
  await page.getByRole('button', { name: /Back/ }).click()
  // Forced, with no wait: the same way the e2e helpers tap.
  await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Keep editing' }).click({ force: true })
  await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeHidden()
  await expect(page.getByPlaceholder('Routine name')).toHaveValue('Half done')
})

test('On animates screens and sheets; Less fades only; Off has none', async ({ page }) => {
  await setAnimations(page, 'On')
  await page.getByRole('link', { name: 'Library' }).click()
  let route = await animationOf(page, '.route-enter')
  expect(route.name).toBe('route-enter')
  expect(route.duration).toBeGreaterThan(0.1)

  await page.getByRole('button', { name: /^Filter/ }).click()
  const panel = await animationOf(page, '.sheet-backdrop > [role="dialog"]')
  expect(panel.name).toBe('sheet-panel-in')
  await page.getByRole('button', { name: 'Done' }).click()

  await setAnimations(page, 'Less')
  await page.getByRole('link', { name: 'Library' }).click()
  route = await animationOf(page, '.route-enter')
  expect(route.name).toBe('motion-fade-in')
  expect(route.duration).toBeGreaterThan(0.1)

  await setAnimations(page, 'Off')
  await page.getByRole('link', { name: 'Library' }).click()
  route = await animationOf(page, '.route-enter')
  expect(route.duration).toBeLessThan(0.001)
  await page.getByRole('button', { name: /^Filter/ }).click()
  const offPanel = await animationOf(page, '.sheet-backdrop > [role="dialog"]')
  expect(offPanel.duration).toBeLessThan(0.001)
})
