import { expect, test } from '@playwright/test'
import { HP_PER_GOAL_DAY, bossForWeek } from '../src/domain/game/bosses'
import { finishWorkout } from './helpers'

// Weekly boss battles: Today's compact card, the full /boss screen, and the
// Complete screen's hit reward, all reading the same deterministic weekly
// boss. The clock is pinned to a Monday-start week's midday so bossForWeek
// is predictable and the suite can't straddle a week/day boundary.
test('this week\'s boss takes a hit from a finished workout, and shows on Today and /boss', async ({ page }) => {
  test.setTimeout(180_000)

  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (day === 0 ? -6 : 1 - day))
  monday.setHours(12, 0, 0, 0)
  await page.clock.install({ time: monday })

  const boss = bossForWeek(monday)
  // No schedule yet: weeklyGoal falls back to 2, so maxHp is 2 * HP_PER_GOAL_DAY.
  const maxHp = 2 * HP_PER_GOAL_DAY

  // Today's compact card names this week's boss at full HP before any hit.
  await page.goto('/#/')
  const card = page.getByRole('link', { name: new RegExp(`^This week: ${boss.name}, ${maxHp} of ${maxHp} HP$`) })
  await expect(card).toBeVisible()

  // The full /boss screen: the boss's name and flavor, a full HP bar, no
  // hits yet, and no past weeks (this is the very first one).
  await card.click()
  await expect(page).toHaveURL(/#\/boss/)
  await expect(page.getByRole('heading', { name: boss.name })).toBeVisible()
  await expect(page.getByText(boss.flavor)).toBeVisible()
  await expect(page.getByRole('progressbar', { name: `${boss.name}'s HP: ${maxHp} of ${maxHp}` })).toBeVisible()
  await expect(page.getByText("No hits landed yet this week")).toBeVisible()
  await expect(page.getByText("Your first week's boss is still ahead of you.")).toBeVisible()

  // A full workout lands real hits: the Complete screen's rewards card
  // names the boss and a positive number, with the HP bar reflecting it.
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  const hitText = page.getByText(new RegExp(`(You hit ${boss.name} for \\d+!|${boss.name} defeated!)`))
  await expect(hitText).toBeVisible()

  // Back on /boss, the HP dropped (or the boss is down) and today's hits
  // show up in the week's log.
  await page.goto('/#/boss')
  const defeated = await page.getByTestId('boss-defeated-banner').isVisible().catch(() => false)
  if (defeated) {
    await expect(page.getByTestId('boss-defeated-banner')).toContainText(`${boss.name} defeated!`)
  } else {
    const label = await page.getByRole('progressbar', { name: new RegExp(`^${boss.name}'s HP:`) }).getAttribute('aria-label')
    expect(label).toMatch(new RegExp(`^${boss.name}'s HP: \\d+ of ${maxHp}$`))
    expect(label).not.toBe(`${boss.name}'s HP: ${maxHp} of ${maxHp}`)
  }
  // Each day shows one number, the damage it dealt; the hit and crit counts
  // (every met set is a crit, so they nearly always match) are spoken only.
  const today = page.getByTestId('boss-day').first()
  await expect(today.getByTestId('boss-day-damage')).toHaveText(/^\d+$/)
  await expect(today.locator('.sr-only')).toContainText(/\d+ hits?/)

  // Today's card agrees with /boss (defeated, or the same lower HP).
  await page.goto('/#/')
  if (defeated) {
    await expect(page.getByRole('link', { name: new RegExp(`^This week: ${boss.name}, defeated$`) })).toBeVisible()
  } else {
    await expect(
      page.getByRole('link', { name: new RegExp(`^This week: ${boss.name}, \\d+ of ${maxHp} HP$`) })
    ).toBeVisible()
  }
})
