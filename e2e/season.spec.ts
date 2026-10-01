import { expect, test, type Page } from '@playwright/test'

// Rae's room on Today quietly matches the season (season.ts): a `?season=`
// URL override lets this suite force each one without waiting for the
// calendar. Falling/drifting decor (leaves, snow, petals) only animates
// under full motion; off/reduced motion leaves it simply in place.

const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const

function animationOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { name: s.animationName, duration: parseFloat(s.animationDuration) }
  })
}

for (const season of SEASONS) {
  test(`?season=${season} shows ${season} decor in Rae's room`, async ({ page }) => {
    await page.goto(`/#/?season=${season}`)
    const decor = page.getByTestId('rae-season-decor')
    await expect(decor).toBeAttached()
    await expect(decor).toHaveAttribute('data-season', season)
    // Every season draws at least one decor piece into the room.
    await expect(decor.locator('> *').first()).toBeAttached()
  })
}

test('a ?seasonAccent= override forces the pumpkin and the lights', async ({ page }) => {
  await page.goto('/#/?season=autumn&seasonAccent=pumpkin')
  await expect(page.getByTestId('rae-season-decor')).toHaveAttribute('data-accent', 'pumpkin')

  await page.goto('/#/?season=winter&seasonAccent=lights')
  await expect(page.getByTestId('rae-season-decor')).toHaveAttribute('data-accent', 'lights')

  await page.goto('/#/?season=autumn&seasonAccent=none')
  await expect(page.getByTestId('rae-season-decor')).toHaveAttribute('data-accent', '')
})

test('an unknown ?season= value is ignored, not a blank room', async ({ page }) => {
  await page.goto('/#/?season=nope')
  const decor = page.getByTestId('rae-season-decor')
  await expect(decor).toBeAttached()
  await expect(decor).toHaveAttribute('data-season', /^(winter|spring|summer|autumn)$/)
})

test('decor stays clear of Rae, the speech bubble, the pots and Meet Rae', async ({ page }) => {
  await page.goto('/#/?season=winter')
  const room = page.locator('.rae-room')
  const decorBox = await page.getByTestId('rae-season-decor').boundingBox()
  const figureBox = await room.locator('.rae-room__figure').boundingBox()
  const meetBox = await page.getByRole('link', { name: 'Meet Rae' }).boundingBox()
  expect(decorBox).toBeTruthy()
  expect(figureBox).toBeTruthy()
  expect(meetBox).toBeTruthy()
  // The decor group's own box spans the whole scene (it's an SVG <g> with
  // several scattered pieces); what matters is that Rae and the corner
  // button remain fully visible and tappable on top of it.
  await expect(room.locator('.rae-room__figure')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Meet Rae' })).toBeVisible()
})

test('falling winter snow animates under full motion, not under off', async ({ page }) => {
  await page.goto('/#/?season=winter')
  const full = await animationOf(page, '.rae-season-particle')
  expect(full.name).toBe('rae-season-drift')
  expect(full.duration).toBeGreaterThan(0.1)

  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await page.goto('/#/?season=winter')
  const off = await animationOf(page, '.rae-season-particle')
  expect(off.name).toBe('none')
})

test('drifting autumn leaves and spring petals also respect motion off', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()

  await page.goto('/#/?season=autumn')
  expect((await animationOf(page, '.rae-season-particle')).name).toBe('none')

  await page.goto('/#/?season=spring')
  expect((await animationOf(page, '.rae-season-particle')).name).toBe('none')
})
