import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout, openProgressMore } from './helpers'

// Swapping a move on the Start screen: for this workout only, she picks the
// replacement, and the routine itself never changes.
test('swap a move for today, run it, and the routine stays as written', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  const list = page.getByRole('list', { name: 'Your workout' })
  await expect(list).toContainText('Bodyweight Squat')

  await page.getByRole('button', { name: 'Swap Bodyweight Squat' }).click()
  await expect(page.getByRole('heading', { name: /Swap Bodyweight Squat/ })).toBeVisible()
  // Same-muscle moves lead, labelled by the muscle group.
  await expect(page.getByRole('region', { name: 'Legs' })).toBeVisible()
  const pick = page.getByRole('region', { name: 'Legs' }).getByRole('button').first()
  const picked = ((await pick.getAttribute('aria-label')) ?? '').replace(/^Swap in /, '')
  expect(picked).not.toBe('')
  await pick.click()

  await expect(list).toContainText(picked)
  await expect(list).not.toContainText('Bodyweight Squat')
  await expect(page.getByRole('button', { name: `${picked}, swapped in. Change` })).toBeVisible()

  // Undo is one tap from the same button.
  await page.getByRole('button', { name: `${picked}, swapped in. Change` }).click()
  await page.getByRole('button', { name: 'Back to Bodyweight Squat' }).click()
  await expect(list).toContainText('Bodyweight Squat')

  // Swap again and run it.
  await page.getByRole('button', { name: 'Swap Bodyweight Squat' }).click()
  await page.getByRole('button', { name: `Swap in ${picked}` }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: picked })).toBeVisible()
  await finishWorkout(page)
  await page.getByRole('link', { name: 'Back to Today' }).click()

  // History shows what she actually did.
  await page.getByRole('link', { name: 'Progress' }).click()
  await openProgressMore(page)
  await page.getByText('Full-Body A').first().click()
  await expect(page.getByText(picked).first()).toBeVisible()

  // The routine is untouched: next time it starts with the squat again.
  await page.goto('about:blank')
  await page.goto('/#/checkin/fs.full-body-a')
  await expect(page.getByRole('list', { name: 'Your workout' })).toContainText('Bodyweight Squat')
})
