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
  await page.getByRole('button', { name: 'Save a backup' }).click()
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

test('restoring a backup after a reinstall brings back the profile name and emblem', async ({ page }) => {
  // Her backup, as exported from a profile named Rae with an emblem.
  await page.goto('/#/settings')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save a backup' }).click()
  const backup = JSON.parse(await readFile(await (await downloading).path(), 'utf8'))
  backup.profile = { ...backup.profile, name: 'Rae', emblem: 'lilac-puff' }
  const file = join(tmpdir(), `rae-backup-${Date.now()}.json`)
  await writeFile(file, JSON.stringify(backup))

  // This device is fresh (default "Me", no emblem): restoring fills both in.
  await page.locator('input[type="file"]').setInputFiles(file)
  // Import reloads the page once it has merged.
  const reloaded = page.waitForEvent('load')
  await page.getByRole('button', { name: 'Add to Me' }).click()
  await reloaded
  await page.goto('/#/settings')
  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('workout-app:profiles') ?? '{}'))
  expect(profiles.profiles[0]).toMatchObject({ id: 'default', name: 'Rae', emblem: 'lilac-puff' })
  await expect(page.getByText('Rae').first()).toBeVisible()
})

// A write that fails on the phone (storage full, a flaky disk) must say so,
// leave the workout exactly where it was, and work on the next try.
test('a failed save keeps the set and works on retry', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await startQuick10(page)
  // The next IndexedDB add throws once, like a full disk.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add
    let armed = true
    IDBObjectStore.prototype.add = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['add']>) {
      if (armed) {
        armed = false
        throw new DOMException('Disk full', 'QuotaExceededError')
      }
      return original.apply(this, args)
    }
  })
  const armedBar = page.locator('[data-armed="true"]')
  await expect(armedBar).toBeVisible()
  await page.getByRole('button', { name: 'Complete Set', exact: true }).click()
  const yes = page.getByRole('button', { name: 'Yes', exact: true })
  if (await yes.isVisible().catch(() => false)) {
    await expect(armedBar).toBeVisible()
    await yes.click()
  }
  await expect(page.getByText(/Couldn't save on this device|out of space/)).toBeVisible()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()
  await expect(page.getByRole('timer')).toHaveCount(0)

  // Retry: the same tap now saves, and the rest starts.
  await expect(armedBar).toBeVisible()
  // The rep question is still up after a failed save; otherwise start over.
  if (await yes.isVisible().catch(() => false)) {
    await yes.click()
  } else {
    await page.getByRole('button', { name: 'Complete Set', exact: true }).click()
    await expect(armedBar).toBeVisible()
    await yes.click()
  }
  await expect(page.getByRole('timer')).toBeVisible()
})
