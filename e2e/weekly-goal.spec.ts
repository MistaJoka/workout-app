import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Progress and Today lead with this week toward the goal (planned days, or
// 2 with no plan), so a first workout reads "1 of 2", never "0 week streak".

async function doQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
}

test('this week counts toward the goal on Today and Progress, then says it is met', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/#/')
  await expect(page.getByRole('link', { name: 'Goal: 2 this week. Plan your week.' })).toBeVisible()

  await doQuick10(page)
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: '1 of 2 this week. Plan your week.' })).toBeVisible()
  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByText('this week', { exact: true })).toBeVisible()
  await expect(page.getByText('1 of 2', { exact: true })).toBeVisible()
  await expect(page.getByText('week streak')).toBeHidden()

  await doQuick10(page)
  await page.goto('/#/')
  await expect(page.getByRole('link', { name: 'Goal met, 2 of 2. Plan your week.' })).toBeVisible()
  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByText('goal met', { exact: true })).toBeVisible()
})
