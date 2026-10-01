import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Rae's room grows with the user's Bloom level (roomUnlocks.ts): small
// permanent decorations unlock in order and are never lost. A `?level=`
// query override (RaeHero.tsx's resolveRoomLevel, the same shape as
// season.ts's `?season=`) forces the room's level for these tests and for
// screenshots/QA, without finishing dozens of real workouts.

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

test('level 1 (before the first unlock) shows none of the room growth decor', async ({ page }) => {
  await page.goto('/#/?level=1')
  await expect(page.getByTestId('rae-room-growth')).toBeAttached()
  for (const item of ['wallFrame', 'cushion', 'bookshelf', 'hangingPlant', 'windowSeat', 'rugPattern']) {
    await expect(page.getByTestId(`rae-room-unlock-${item}`)).toHaveCount(0)
  }
})

test('level 5 shows exactly the unlocks earned so far, not later ones', async ({ page }) => {
  await page.goto('/#/?level=5')
  for (const item of ['wallFrame', 'cushion', 'bookshelf']) {
    await expect(page.getByTestId(`rae-room-unlock-${item}`)).toBeAttached()
  }
  for (const item of ['rugPattern', 'hangingPlant', 'windowSeat']) {
    await expect(page.getByTestId(`rae-room-unlock-${item}`)).toHaveCount(0)
  }
})

test('level 15 shows every unlock, including the warmer lights and rug pattern', async ({ page }) => {
  await page.goto('/#/?level=15')
  for (const item of ['wallFrame', 'cushion', 'bookshelf', 'rugPattern', 'hangingPlant', 'windowSeat']) {
    await expect(page.getByTestId(`rae-room-unlock-${item}`)).toBeAttached()
  }
})

test('an unknown/invalid ?level= is ignored rather than blanking the room', async ({ page }) => {
  await page.goto('/#/?level=nope')
  await expect(page.getByTestId('rae-room-growth')).toBeAttached()
  await page.goto('/#/?level=0')
  await expect(page.getByTestId('rae-room-growth')).toBeAttached()
})

test('the newest unlock twinkles in once, then not again', async ({ page }) => {
  await page.goto('/#/?level=5')
  const bookshelf = page.getByTestId('rae-room-unlock-bookshelf')
  await expect(bookshelf).toHaveClass(/rae-unlock-new/)
  const twinkle = await animationOf(page, '[data-testid="rae-room-unlock-bookshelf"]')
  expect(twinkle.name).toBe('rae-unlock-twinkle')
  expect(twinkle.duration).toBeGreaterThan(0.1)
  // Earlier unlocks (already seen in spirit, earned at the same visit) and
  // later ones don't get the twinkle - only the newest does.
  await expect(page.getByTestId('rae-room-unlock-wallFrame')).not.toHaveClass(/rae-unlock-new/)
  await expect(page.getByTestId('rae-room-unlock-cushion')).not.toHaveClass(/rae-unlock-new/)

  // Reopening Today at the same level never twinkles the same unlock twice.
  await page.goto('about:blank')
  await page.goto('/#/?level=5')
  await expect(bookshelf).not.toHaveClass(/rae-unlock-new/)
})

test('leveling up further twinkles only the new unlock, not earlier ones', async ({ page }) => {
  await page.goto('/#/?level=5')
  await expect(page.getByTestId('rae-room-unlock-bookshelf')).toHaveClass(/rae-unlock-new/)

  await page.goto('about:blank')
  await page.goto('/#/?level=9')
  await expect(page.getByTestId('rae-room-unlock-bookshelf')).not.toHaveClass(/rae-unlock-new/)
  await expect(page.getByTestId('rae-room-unlock-rugPattern')).toHaveClass(/rae-unlock-new/)
})

test('with motion off, the newest unlock is simply there, no twinkle', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await page.goto('/#/?level=5')

  await expect(page.getByTestId('rae-room-unlock-bookshelf')).toHaveClass(/rae-unlock-new/)
  const still = await animationOf(page, '[data-testid="rae-room-unlock-bookshelf"]')
  expect(still.name).toBe('none')
})

test('with motion reduced, the newest unlock fades rather than twinkling', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Less', exact: true }).click()
  await page.goto('/#/?level=5')

  const fade = await animationOf(page, '[data-testid="rae-room-unlock-bookshelf"]')
  expect(fade.name).toBe('rae-unlock-fade')
})

test('every unlocked item stays clear of Rae, the speech bubble, the pots and Meet Rae', async ({ page }) => {
  test.setTimeout(120_000)
  // A real finished workout grows a garden pot, so the pots zone is really
  // on screen (not just assumed empty) while every room unlock is forced on.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/?level=15')
  await page.waitForTimeout(900) // let the twinkle-in settle before measuring

  const figureBox = await page.locator('.rae-room__figure').boundingBox()
  const meetBox = await page.getByRole('link', { name: 'Meet Rae' }).boundingBox()
  const saysBox = await page.getByTestId('rae-says').boundingBox()
  const potsBox = await page.getByTestId('rae-pots').boundingBox()
  expect(figureBox).toBeTruthy()
  expect(meetBox).toBeTruthy()
  expect(potsBox).toBeTruthy()

  for (const item of ['wallFrame', 'cushion', 'bookshelf', 'hangingPlant', 'windowSeat']) {
    const itemBox = await page.getByTestId(`rae-room-unlock-${item}`).boundingBox()
    expect(itemBox, `${item} should have a box`).toBeTruthy()
    expect(overlaps(itemBox, figureBox), `${item} overlaps Rae's figure`).toBe(false)
    expect(overlaps(itemBox, meetBox), `${item} overlaps Meet Rae`).toBe(false)
    expect(overlaps(itemBox, saysBox), `${item} overlaps the speech bubble`).toBe(false)
    expect(overlaps(itemBox, potsBox), `${item} overlaps the garden pots`).toBe(false)
  }

  // Rae and Meet Rae both stay fully visible and tappable on top of the room.
  await expect(page.locator('.rae-room__figure')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Meet Rae' })).toBeVisible()
})

test('season decor and room growth decor coexist without error', async ({ page }) => {
  await page.goto('/#/?level=15&season=winter')
  await expect(page.getByTestId('rae-season-decor')).toBeAttached()
  await expect(page.getByTestId('rae-room-growth')).toBeAttached()
  await expect(page.getByTestId('rae-room-unlock-windowSeat')).toBeAttached()
})

test('Progress shows the next room unlock under the level bar', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/progress')
  const next = page.getByTestId('next-room-unlock')
  await expect(next).toBeVisible()
  await expect(next).toHaveText(/^Next unlock: .+ at level \d+$/)
})
