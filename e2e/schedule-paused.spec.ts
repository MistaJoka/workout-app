import { expect, test } from '@playwright/test'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

test('schedule rows show each day at a glance and invite planning', async ({ page }) => {
  await page.goto('/#/schedule')
  const today = WEEKDAYS[new Date().getDay()]
  const other = WEEKDAYS[(new Date().getDay() + 1) % 7]

  // Empty days invite the tap; the row's name still says "Not planned".
  const otherRow = page.getByRole('button', { name: new RegExp(`^${other}`) })
  await expect(otherRow).toContainText('+ Plan')
  await expect(otherRow).toHaveAccessibleName(`${other} Not planned`)
  await expect(page.getByText('Plan a workout day and you can add reminders to your Calendar.')).toBeVisible()

  // Today is marked without changing the row's name.
  const todayRow = page.getByRole('button', { name: new RegExp(`^${today}`) })
  await expect(todayRow).toContainText('Today')
  await expect(todayRow).toHaveAccessibleName(`${today} Not planned`)

  await otherRow.click()
  await page.getByRole('radiogroup', { name: `${other} plan` }).getByRole('radio', { name: 'Full-Body A' }).click()
  await expect(page.getByRole('button', { name: `${other} Full-Body A` })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to Calendar' })).toBeVisible()
  await expect(page.getByText('Plan a workout day and you can add reminders to your Calendar.')).toBeHidden()

  await todayRow.click()
  await page.getByRole('radiogroup', { name: `${today} plan` }).getByRole('radio', { name: 'Rest' }).click()
  await expect(page.getByRole('button', { name: `${today} Rest` })).toBeVisible()
})

test('the paused screen shows what is waiting and offers a real End workout button', async ({ page }) => {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()

  await expect(page.getByText('Take your time')).toBeVisible()
  await expect(page.getByText('Bodyweight Squat')).toBeVisible()
  await expect(page.getByText('Set 1 of 2')).toBeVisible()

  const end = page.getByRole('button', { name: 'End workout' })
  const box = await end.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)

  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
})
