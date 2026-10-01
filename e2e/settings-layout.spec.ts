import { expect, test } from '@playwright/test'

// Settings reads as grouped cards with exactly one way to save a backup;
// the backup card turns into the reminder only when a backup is due.
test('settings is grouped, with a single backup action', async ({ page }) => {
  await page.goto('/#/settings')
  for (const title of ['You', 'Workout', 'Backup', 'More']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Save a backup' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Export data' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import data' })).toBeVisible()
  // Nothing to lose yet: the card is a plain card, not a reminder.
  await expect(page.getByRole('region', { name: 'Backup reminder' })).toHaveCount(0)

  // Every control in the Workout card is a real touch target.
  for (const name of ['lb', 'kg', /^Sound (on|off)$/]) {
    const box = await page.getByRole('button', { name }).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await page.getByText('Danger zone').click()
  await expect(page.getByRole('button', { name: 'Erase everything' })).toBeDisabled()
})
