import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// "Afterglow" (afterglow.ts): on a day a workout was finished, Rae's room
// on Today stays warm and celebratory - a corner glow, brighter fairy
// lights, a few floating sparkles and a halo on the newest garden pot. It
// is derived purely from the same garden `flowers` RaeHero already shows
// (the newest one's endedAt being today), so a fresh profile with nothing
// grown yet never shows it.

function animationOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { name: s.animationName, duration: parseFloat(s.animationDuration) }
  })
}

function overlaps(a: { x: number; y: number; width: number; height: number } | null, b: typeof a): boolean {
  if (!a || !b) return false
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

async function finishQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

test('a fresh profile with no finished workout shows no afterglow', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByTestId('rae-afterglow-decor')).toHaveCount(0)
  await expect(page.locator('.rae-room')).toHaveAttribute('data-afterglow', 'false')
  await expect(page.locator('.rae-pots__halo')).toHaveCount(0)
})

test('finishing a workout today turns on the afterglow back on Today', async ({ page }) => {
  test.setTimeout(120_000)
  await finishQuick10(page)

  await page.goto('/#/')
  await expect(page.locator('.rae-room')).toHaveAttribute('data-afterglow', 'true')
  const decor = page.getByTestId('rae-afterglow-decor')
  await expect(decor).toBeAttached()
  // The warm corner glow and at least one sparkle are both drawn.
  await expect(decor.locator('.rae-afterglow-glow')).toBeAttached()
  await expect(decor.locator('.rae-afterglow-sparkle').first()).toBeAttached()
  // The newest pot (the one flower grown so far) gets a soft halo.
  await expect(page.locator('.rae-pots__halo')).toHaveCount(1)
})

test('with motion off, the afterglow is simply there with no running animation', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await finishQuick10(page)

  await page.goto('/#/')
  await expect(page.getByTestId('rae-afterglow-decor')).toBeAttached()
  const glow = await animationOf(page, '.rae-afterglow-glow')
  expect(glow.name).toBe('none')
  const sparkle = await animationOf(page, '.rae-afterglow-sparkle')
  expect(sparkle.name).toBe('none')
  const halo = await animationOf(page, '.rae-pots__halo')
  expect(halo.name).toBe('none')
})

test('with full motion, the glow and sparkles run gentle loops', async ({ page }) => {
  test.setTimeout(120_000)
  await finishQuick10(page)

  await page.goto('/#/')
  const glow = await animationOf(page, '.rae-afterglow-glow')
  expect(glow.name).toBe('rae-afterglow-pulse')
  expect(glow.duration).toBeGreaterThan(0.1)
  const sparkle = await animationOf(page, '.rae-afterglow-sparkle')
  expect(sparkle.name).toBe('rae-afterglow-float')
  expect(sparkle.duration).toBeGreaterThan(0.1)
})

test('afterglow decor stays clear of Rae, the speech bubble and Meet Rae', async ({ page }) => {
  test.setTimeout(120_000)
  await finishQuick10(page)

  await page.goto('/#/')
  const figureBox = await page.locator('.rae-room__figure').boundingBox()
  const meetBox = await page.getByRole('link', { name: 'Meet Rae' }).boundingBox()
  const saysBox = await page.getByTestId('rae-says').boundingBox()
  const decorBox = await page.getByTestId('rae-afterglow-decor').boundingBox()
  expect(figureBox).toBeTruthy()
  expect(meetBox).toBeTruthy()
  expect(decorBox).toBeTruthy()

  // The decor group's own box spans a chunk of the scene (it holds a wide
  // corner glow plus scattered sparkles); what matters is that Rae, the
  // bubble and the corner button stay fully visible and tappable on top.
  await expect(page.locator('.rae-room__figure')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Meet Rae' })).toBeVisible()
  if (saysBox) {
    expect(overlaps(decorBox, saysBox), 'afterglow decor should not overlap the speech bubble').toBe(false)
  }

  // The pot halo sits behind the newest pot only, never over the bubble,
  // Rae's figure or Meet Rae.
  const haloBox = await page.locator('.rae-pots__halo').boundingBox()
  expect(haloBox).toBeTruthy()
  expect(overlaps(haloBox, figureBox), 'pot halo overlaps Rae').toBe(false)
  expect(overlaps(haloBox, meetBox), 'pot halo overlaps Meet Rae').toBe(false)
  expect(overlaps(haloBox, saysBox), 'pot halo overlaps the speech bubble').toBe(false)
})
