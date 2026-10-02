import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// Hubby Bunny's surprise love notes end to end: nothing to unlock before
// he's written anything, writing a note behind the shop's PIN (reachable
// from both Settings and the shop), a guaranteed unlock on the workout that
// meets the week's goal, the Complete screen's reveal, Today's unread
// badge, and rereading from the notes box.
//
// Determinism: the per-workout unlock chance is seeded by a session id this
// test can't control, so the first workout below finishes while zero notes
// exist at all (nothing can unlock regardless of the roll) and the second
// is the one that reaches the default weekly goal of 2 (a guaranteed
// unlock once a locked note exists) -- the test never depends on the 40%
// chance landing either way.

// input[type=password] has no accessible "textbox" role, so it's found by
// its accessible label instead of getByRole (same convention as rewards.spec.ts).
async function enterPin(page: import('@playwright/test').Page, pin: string, label: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(pin)
}

test('writing, unlocking, reading and rereading a Hubby Bunny love note', async ({ page }) => {
  test.setTimeout(150_000)

  // Workout 1: finishes before any note exists, so nothing can unlock no
  // matter what the per-session roll would have said.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByTestId('love-note-reward-item')).toHaveCount(0)

  // Reachable from Settings -> "Hubby's reward shop" (cancelling that PIN
  // sheet, which is the shop's own) and then the shop's "Love notes" link.
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await expect(page.getByText('Set a PIN')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('link', { name: 'Love notes' }).click()
  await expect(page.getByRole('heading', { name: 'Love notes' })).toBeVisible()

  // First-time setup from the notes box: its own PIN sheet, same gate/PIN
  // as the shop.
  await page.getByRole('button', { name: 'Set up' }).click()
  await expect(page.getByText('Set a PIN')).toBeVisible()
  await enterPin(page, '4821', 'New PIN')
  await enterPin(page, '4821', 'Confirm PIN')
  await page.getByRole('button', { name: 'Save PIN' }).click()

  // The editor opens right away; write the first (and only) note.
  await expect(page.getByText('Write a love note')).toBeVisible()
  await page.getByRole('button', { name: '+ Write a note' }).click()
  await page.getByLabel('Note text').fill('Proud of you, superstar')
  await page.getByRole('button', { name: 'Add to queue' }).click()
  await expect(page.getByText('Locked (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // Back on the notes box: one sealed note, no text shown.
  await expect(page.getByTestId('love-notes-sealed')).toContainText('1 sealed note waiting')
  await expect(page.getByText('Proud of you, superstar')).toHaveCount(0)

  // Workout 2: the second finished workout this week meets the default
  // weekly goal (2), which guarantees an unlock now that a locked note
  // exists.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByTestId('love-note-reward-item')).toContainText('A note from Hubby Bunny!')

  // Today's badge shows the unlocked-but-unread note.
  await page.goto('/#/')
  await expect(page.getByTestId('love-note-badge')).toBeVisible()

  // Open it from the notes box: the envelope plays through to the letter.
  await page.goto('/#/notes')
  await expect(page.getByTestId('love-notes-sealed')).toContainText('All opened')
  await expect(page.getByText('New')).toBeVisible()
  await page.getByTestId('love-note-row').click()
  await expect(page.getByTestId('love-note-envelope')).toBeVisible()
  await expect(page.getByTestId('love-note-text')).toContainText('Proud of you, superstar')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByTestId('love-note-envelope')).toHaveCount(0)
  await expect(page.getByText('New')).toHaveCount(0)

  // Reading it clears Today's badge.
  await page.goto('/#/')
  await expect(page.getByTestId('love-note-badge')).toHaveCount(0)

  // Rereading from the notes box still works (the "New" tag is gone, but
  // the row itself still opens the envelope), and Progress's collection
  // tile agrees on the opened count.
  await page.goto('/#/notes')
  await page.getByTestId('love-note-row').click()
  await expect(page.getByTestId('love-note-text')).toContainText('Proud of you, superstar')
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.goto('/#/progress')
  await expect(page.getByRole('link', { name: /Love notes: 1 opened/ })).toBeVisible()
})
