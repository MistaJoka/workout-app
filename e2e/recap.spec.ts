import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// "Your week in bloom": a story-style recap of a Monday-start week. The
// page clock is pinned to a Sunday so the Today offer and week windows are
// deterministic (time still flows, so auto-advance runs).
test.describe('weekly recap', () => {
  test('Sunday offers the week; slides tap through, auto-advance, and the offer retires once seen', async ({ page }) => {
    test.setTimeout(150_000)
    await page.clock.install({ time: new Date(2026, 9, 4, 12) }) // Sunday Oct 4, week of Sep 28

    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)

    // Reduced motion never auto-advances, so the taps below are the only driver.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/')
    const entry = page.getByRole('link', { name: /Your week in bloom/ })
    await expect(entry).toBeVisible()
    await entry.click()
    await expect(page).toHaveURL(/#\/recap\?week=2026-09-28/)
    await expect(page.getByRole('heading', { name: 'Your week in bloom' })).toBeVisible()
    await expect(page.getByText('1 of 2. Every one counts.')).toBeVisible()

    // Tap right for next, left for back.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText(/sets? done/)).toBeVisible()
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(page.getByRole('heading', { name: 'Your week in bloom' })).toBeVisible()

    // The flowers slide names this week's species.
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: /1 flower grew/ })).toBeVisible()

    // Through to Rae's sign-off and Done, which returns to Today.
    for (let i = 0; i < 4 && !(await page.getByRole('button', { name: 'Done' }).isVisible()); i++) {
      await page.getByRole('button', { name: 'Next' }).click()
    }
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page).toHaveURL(/#\/$/)
    await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Your week in bloom/ })).toBeHidden()

    // Full motion advances on its own after about four seconds.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/#/recap?week=2026-09-28')
    await expect(page.getByRole('heading', { name: 'Your week in bloom' })).toBeVisible()
    await page.clock.fastForward(4500)
    await expect(page.getByText(/sets? done/)).toBeVisible()
  })

  test('a quiet week is gentle and reachable from ?week=', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 4, 12) })
    await page.goto('/#/recap?week=2026-09-14')
    await expect(page.getByText('A quiet week', { exact: true })).toBeVisible()
    await expect(page.getByText('Rest weeks count too.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Close your week' }).click()
    await expect(page).toHaveURL(/#\/$/)
  })
})
