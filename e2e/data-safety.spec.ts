import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dismissWelcome, finishWorkout } from './helpers'

// Backups: a damaged file is refused before anything is written, and a
// backup nudge appears once there is a finished workout to lose.

async function startQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()
}

test('a damaged backup is refused and nothing changes', async ({ page }) => {
  await page.goto('/#/settings')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export data' }).click()
  const backup = JSON.parse(await readFile(await (await downloading).path(), 'utf8'))

  // A hand-edited row: a progression level that isn't a number.
  backup.progression = [
    {
      exerciseId: 'fs.bodyweight-squat',
      level: 'lots',
      lastAdvancedAt: null,
      currentPrescribedReps: 10,
      currentWeightKg: null,
      consecutiveFailureStreak: 0,
      pendingCandidate: null,
    },
  ]
  const damaged = join(tmpdir(), `damaged-backup-${Date.now()}.json`)
  await writeFile(damaged, JSON.stringify(backup))

  await page.locator('input[type="file"]').setInputFiles(damaged)
  await expect(page.getByRole('status')).toHaveText(/damaged or from a different app\. Nothing was changed\./)
  await expect(page.getByRole('dialog', { name: 'Import backup' })).toBeHidden()
})

test('the backup nudge appears after a finished workout and goes away once a backup is saved', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/#/settings')
  // Nothing to lose yet: no nudge.
  await expect(page.getByText('Last backup: never')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Backup reminder' })).toBeHidden()

  await page.goto('/')
  await dismissWelcome(page)
  await startQuick10(page)
  await finishWorkout(page)

  await page.goto('/#/settings')
  const nudge = page.getByRole('region', { name: 'Backup reminder' })
  await expect(nudge).toBeVisible()
  const downloading = page.waitForEvent('download')
  await nudge.getByRole('button', { name: 'Save a backup' }).click()
  expect((await downloading).suggestedFilename()).toMatch(/^workout-app-backup-me-/)
  await expect(nudge).toBeHidden()
  await expect(page.getByText('Last backup: never')).toBeHidden()
})
