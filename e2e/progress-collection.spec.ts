import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

test.use({ viewport: { width: 384, height: 824 } })

// The collection grid never leaves one tile stranded on its last row: a
// lone last tile stretches across the row.
test('the last collection tile is never stranded alone', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('about:blank')
  await page.goto('/#/progress')
  const grid = page.getByTestId('collection-grid')
  await expect(grid).toBeVisible()
  const tiles = grid.locator(':scope > *')
  const count = await tiles.count()
  const gridBox = (await grid.boundingBox())!
  const last = (await tiles.nth(count - 1).boundingBox())!
  const prev = (await tiles.nth(count - 2).boundingBox())!
  if (Math.abs(last.y - prev.y) > 1) {
    // Alone on its row: it spans the whole row.
    expect(last.width).toBeGreaterThan(gridBox.width - 2)
  }
})

// Day one: no workouts yet, but the collection (shop, notes, garden...) is
// already reachable from Progress, not only through Settings.
test('a brand-new profile already sees the collection on Progress', async ({ page }) => {
  await page.goto('/#/progress')
  await expect(page.getByText('Your first workout starts the scoreboard.', { exact: false })).toBeVisible()
  await expect(page.getByTestId('collection-grid')).toBeVisible()
  await expect(page.getByTestId('collection-grid').getByRole('link')).not.toHaveCount(0)
})
