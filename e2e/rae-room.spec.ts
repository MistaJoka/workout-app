import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Rae's room shows the newest garden flowers in small pots, and tapping
// Rae herself says hi (a hop, a random line, a petal puff) without losing
// the "Meet Rae" page, which stays reachable from a small corner button.

async function finishQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

function animationOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { name: s.animationName, duration: parseFloat(s.animationDuration) }
  })
}

test('before any workout, the room has no pots and Meet Rae still works', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByTestId('rae-pots')).toHaveCount(0)
  const meet = page.getByRole('link', { name: 'Meet Rae' })
  await expect(meet).toBeVisible()
  await meet.click()
  await expect(page.getByRole('heading', { name: 'Meet Rae' })).toBeVisible()
})

test('a finished workout grows a flower that bounces in once, then not again', async ({ page }) => {
  test.setTimeout(120_000)
  await finishQuick10(page)
  await page.goto('/#/')

  const pots = page.getByTestId('rae-pots')
  await expect(pots).toBeVisible()
  const sprouts = pots.locator('> span')
  await expect(sprouts).toHaveCount(1)
  await expect(sprouts.last()).toHaveClass(/rae-pots__new/)
  const bounce = await animationOf(page, '.rae-pots__new')
  expect(bounce.name).toBe('rae-pot-bounce')
  expect(bounce.duration).toBeGreaterThan(0.1)

  // Reopening Today without a new workout never bounces the same flower twice.
  await page.goto('about:blank')
  await page.goto('/#/')
  await expect(pots.locator('> span')).toHaveCount(1)
  await expect(pots.locator('> span').first()).not.toHaveClass(/rae-pots__new/)
})

test('a second finished workout adds a second pot and bounces only the newest', async ({ page }) => {
  test.setTimeout(180_000)
  await finishQuick10(page)
  await page.goto('/#/')
  await finishQuick10(page)
  await page.goto('/#/')

  const sprouts = page.getByTestId('rae-pots').locator('> span')
  await expect(sprouts).toHaveCount(2)
  await expect(sprouts.nth(0)).not.toHaveClass(/rae-pots__new/)
  await expect(sprouts.nth(1)).toHaveClass(/rae-pots__new/)
})

test('with motion off, the newest pot is simply there, no bounce', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await finishQuick10(page)
  await page.goto('/#/')

  await expect(page.getByTestId('rae-pots').locator('> span')).toHaveCount(1)
  const still = await animationOf(page, '.rae-pots__new')
  expect(still.name).toBe('none')
})

test('tapping Rae hops her and says a random line, announced once, with Meet Rae still reachable', async ({
  page,
}) => {
  await page.goto('/#/')
  const sayHi = page.getByRole('button', { name: 'Say hi to Rae' })
  await expect(sayHi).toBeVisible()

  const bubble = page.getByTestId('rae-says')
  const before = await bubble.textContent()
  await sayHi.click()

  const live = page.locator('p[aria-live="polite"]')
  await expect(live).toHaveText(/^Rae says: /)
  const after = await bubble.textContent()
  expect(after).not.toBe(before)

  const hop = await animationOf(page, '.rae-hop')
  expect(hop.name).toBe('rae-hop')
  expect(hop.duration).toBeGreaterThan(0.1)

  // The line reverts to Rae's usual line after a few seconds.
  await expect(bubble).toHaveText(before ?? '', { timeout: 5_000 })

  // Meet Rae is still a separate, reachable 44px target in the corner.
  const meet = page.getByRole('link', { name: 'Meet Rae' })
  const box = await meet.boundingBox()
  expect(box && box.width >= 44 && box.height >= 44).toBe(true)
  await meet.click()
  await expect(page).toHaveURL(/#\/rae$/)
})

test('with motion off, tapping Rae still shows the line with no hop', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await page.goto('/#/')

  const bubble = page.getByTestId('rae-says')
  const before = await bubble.textContent()
  await page.getByRole('button', { name: 'Say hi to Rae' }).click()
  const after = await bubble.textContent()
  expect(after).not.toBe(before)

  const hop = await animationOf(page, '.rae-hop')
  expect(hop.duration).toBeLessThan(0.001)
})
