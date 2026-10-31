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
  for (const control of [
    page.getByRole('button', { name: 'lb' }),
    page.getByRole('button', { name: 'kg' }),
    page.getByRole('switch', { name: 'Sound' }),
  ]) {
    const box = await control.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  // Sound is a real switch: its label names the setting, aria-checked the state.
  const sound = page.getByRole('switch', { name: 'Sound' })
  const was = await sound.getAttribute('aria-checked')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', was === 'true' ? 'false' : 'true')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', String(was))

  // Legal pages live in About; Settings links there once.
  await expect(page.getByRole('link', { name: 'Privacy', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^About/ })).toBeVisible()

  await page.getByText('Danger zone').click()
  await expect(page.getByRole('button', { name: 'Erase everything' })).toBeDisabled()
})
