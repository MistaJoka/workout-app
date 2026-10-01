import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

async function finishQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

test('finishing shows the new flower, and the backup reminder waits for the 3rd workout', async ({ page }) => {
  test.setTimeout(180_000)
  const flower = page.getByRole('img', { name: "This week's new flower, in bloom" })
  const reminder = page.getByRole('region', { name: 'Backup reminder' })

  await finishQuick10(page)
  await expect(flower).toBeVisible()
  await expect(page.getByText('A new flower just bloomed in your week!')).toBeVisible()
  // A first finish stays a celebration: no backup nag here...
  await expect(reminder).toBeHidden()
  // ...though Settings already asks, from the first workout.
  await page.goto('/#/settings')
  await expect(reminder).toBeVisible()

  await finishQuick10(page)
  await expect(flower).toBeVisible()
  await expect(reminder).toBeHidden()

  await finishQuick10(page)
  await expect(reminder).toBeVisible()
})

test('with animations off, the flower is already in full bloom', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await finishQuick10(page)
  const flower = page.getByRole('img', { name: "This week's new flower, in bloom" })
  await expect(flower).toBeVisible()
  // The petals sit in the head group; with motion off it must not be
  // scaled to nothing while an animation delay runs.
  const scale = await flower.locator('.pixel-bloom__head').evaluate((el) => getComputedStyle(el).transform)
  expect(scale === 'none' || scale === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
})
