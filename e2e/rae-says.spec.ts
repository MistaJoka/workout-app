import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Rae says one short line in her room on Today, matched to the moment. The
// bubble is decorative for screen readers; they hear the line once from the
// sibling "Rae says:" text.
test('Rae greets a first-timer, then cheers a finished workout', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/')
  const bubble = page.getByTestId('rae-says')
  await expect(bubble).toHaveText(/^(Hi! I'll show you every move\.|Let's start with something gentle\.)$/)
  await expect(bubble).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByText(/^Rae says: /)).toHaveCount(1)

  // The bubble sits beside Rae, inside her room, not over the window.
  const room = await page.locator('.rae-room').boundingBox()
  const box = await bubble.boundingBox()
  expect(box && room && box.x > room.x + room.width / 2).toBe(true)

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await page.goto('/#/')
  await expect(bubble).toHaveText(
    /^(Nice work today\. Rest up\.|You showed up today\. That counts\.|Goal met this week\. So proud of you!|That's your week's goal\. Beautiful\.)$/
  )
})
