import { expect, test } from '@playwright/test'

// The Flip 7's folded cover screen is about 361x399 CSS px. Mid-workout the
// one thing she needs is the move itself: Rae must be fully visible above
// the Complete Set bar, not a sliver behind it.
test.use({ viewport: { width: 361, height: 399 } })

test('on the cover screen, Rae doing the move fits above Complete Set', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  const complete = page.getByRole('button', { name: 'Complete Set', exact: true })
  await expect(complete).toBeVisible()
  await page.waitForTimeout(2600) // the opening countdown
  const rae = page.getByRole('img', { name: /^Rae doing a / }).first()
  await expect(rae).toBeVisible()
  const media = (await rae.boundingBox())!
  const bar = (await complete.boundingBox())!
  expect(media.height).toBeGreaterThanOrEqual(100)
  expect(media.y + media.height).toBeLessThanOrEqual(bar.y)
  // The set count sits beside the reps, not under the picture.
  const setLabel = (await page.getByText(/^Set 1 of \d+$/).boundingBox())!
  expect(setLabel.x + setLabel.width).toBeLessThanOrEqual(media.x)
})
