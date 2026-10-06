import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

test.use({ viewport: { width: 384, height: 824 } })

async function openShopAsHubby(page: Page) {
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await page.getByLabel('New PIN', { exact: true }).fill('4821')
  await page.getByLabel('Confirm PIN', { exact: true }).fill('4821')
  await page.getByRole('button', { name: 'Save PIN' }).click()
}

// The first reward can come from the starter ideas (shown while the shop
// is empty); later ones come from the editor's icon grid.
async function addIdea(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click()
}

async function addByIcon(page: Page, name: string) {
  await page.getByRole('button', { name: '+ Add a reward' }).click()
  await page.getByRole('group', { name: 'Reward icons' }).getByRole('button', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}

async function quick10(page: Page) {
  await page.goto('about:blank')
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

test('a mega goal shows as a road; a small one keeps its bar', async ({ page }) => {
  await openShopAsHubby(page)
  // The editor tells a mega price in weeks too.
  await page.getByRole('button', { name: '+ Add a reward' }).click()
  await page.getByRole('button', { name: 'Mega 1000' }).click()
  await expect(page.getByTestId('cost-in-workouts')).toHaveText('≈ 40 workouts, about 15 weeks at 2 a week')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await addIdea(page, 'Road trip')
  await addByIcon(page, 'Nap time')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByText('Mega prize', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Save for this' }).last().click()
  await expect(page.getByRole('progressbar', { name: /^Saving for Road trip: 0 of 1000 carrots/ }).first()).toBeVisible()
  await expect(page.getByTestId('saving-goal').getByTestId('road-progress')).toBeVisible()
  // Rae travels the road (Road trip's own glyph is already the van), and at
  // 0 carrots she sits on the road, not hanging off its left end.
  const road = page.getByTestId('saving-goal').getByTestId('road-progress')
  await expect(road).not.toContainText('🚐')
  const roadBox = (await road.boundingBox())!
  const rae = (await road.getByTestId('road-traveler').boundingBox())!
  expect(rae.x).toBeGreaterThanOrEqual(roadBox.x)
  expect(rae.x + rae.width).toBeLessThanOrEqual(roadBox.x + roadBox.width)
  // A small goal keeps the plain bar.
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Save for this' }).first().click()
  await expect(page.getByTestId('saving-goal')).toContainText('Nap time')
  await expect(page.getByTestId('road-progress')).toHaveCount(0)
})

test('redeeming a smaller treat says, neutrally, how far the goal is', async ({ page }) => {
  test.setTimeout(240_000)
  await quick10(page)
  await quick10(page)
  await openShopAsHubby(page)
  await addIdea(page, 'Road trip')
  await addByIcon(page, 'Nap time')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Save for this' }).last().click()
  await expect(page.getByTestId('saving-goal')).toContainText('Road trip')

  // Redeeming Nap time while saving for the Road trip.
  await page.getByRole('button', { name: 'Redeem' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Redeem Nap time' })
  await expect(dialog.getByText(/^Road trip: \d+ workouts to go after this\.$/)).toBeVisible()
  await dialog.getByRole('button', { name: /Cancel|Not now|Close/ }).first().click()

  // Not saving for anything: redeeming says nothing about "to go".
  await page.getByRole('button', { name: 'Saving ⭐' }).click()
  await expect(page.getByTestId('saving-goal')).toHaveCount(0)
  await page.getByRole('button', { name: 'Redeem' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Redeem Nap time' }).getByText(/to go after this/)).toHaveCount(0)
})

test('a workout visibly feeds the goal: carrots tick up, then flow in on Complete', async ({ page }) => {
  test.setTimeout(180_000)
  await openShopAsHubby(page)
  await addIdea(page, 'Road trip')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Save for this' }).click()

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByTestId('live-carrots')).toHaveCount(0)
  // One set, tapped the way the shared helper does (the opening countdown
  // and the thumb bar's arm window can swallow an early tap).
  const chip = page.getByTestId('live-carrots')
  for (let i = 0; i < 60 && !(await chip.isVisible().catch(() => false)); i++) {
    const armed = await page.locator('[data-armed="true"]').isVisible().catch(() => false)
    const yes = page.getByRole('button', { name: 'Yes', exact: true })
    const complete = page.getByRole('button', { name: 'Complete Set', exact: true })
    if (armed && (await yes.isVisible().catch(() => false))) await yes.click({ force: true, timeout: 2000 }).catch(() => {})
    else if (armed && (await complete.isVisible().catch(() => false))) await complete.click({ force: true, timeout: 2000 }).catch(() => {})
    else await page.waitForTimeout(200)
  }
  await expect(chip).toHaveAccessibleName('1 carrot earned so far')

  await finishWorkout(page)
  await expect(page.getByTestId('goal-gain')).toContainText(/Road trip\s*0 → \d+ \/ 1000/)
})

test('Today and Schedule show what a workout or a week is worth toward the goal', async ({ page }) => {
  await openShopAsHubby(page)
  await addIdea(page, 'Road trip')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Save for this' }).click()

  await page.goto('/#/')
  await expect(page.locator('.today-mission').getByText('+≈25 🥕 toward Road trip')).toBeVisible()

  await page.goto('/#/schedule')
  for (const day of ['Monday', 'Wednesday', 'Friday']) {
    await page.getByRole('button', { name: new RegExp(`^${day}`) }).click()
    await page.getByRole('radio', { name: 'Full-Body A' }).click()
  }
  await expect(page.getByText(/^3 days a week ≈ \+95 🥕 a week · Road trip in ~11 weeks$/)).toBeVisible()

  // Not saving for anything: both lines go away.
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Saving ⭐' }).click()
  await page.goto('/#/')
  await expect(page.getByText(/toward Road trip/)).toHaveCount(0)
  await page.goto('/#/schedule')
  await expect(page.getByText(/days a week ≈/)).toHaveCount(0)
})
