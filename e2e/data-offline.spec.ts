import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { dismissWelcome, finishWorkout } from './helpers'

// Data safety and offline paths that the golden path doesn't reach:
// offline after ONE visit (the worker precaches every built chunk at
// install), resuming a workout mid-session with the network off, and
// importing someone else's backup without losing this person's history.

async function waitForWorker(page: Page): Promise<void> {
  // `ready` resolves once install (the precache) has finished; the worker
  // then claims this page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true)
}

async function startQuick10(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()
}

// Raw IndexedDB count of the active profile's session events, so the test
// sees exactly what was stored, not what a screen chose to show.
function countEvents(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const state = JSON.parse(localStorage.getItem('workout-app:profiles') ?? '{"activeId":"default"}')
        const name = state.activeId === 'default' ? 'workout-app-v06' : `workout-app-v06:${state.activeId}`
        const open = indexedDB.open(name)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const count = db.transaction('sessionEvents').objectStore('sessionEvents').count()
          count.onsuccess = () => {
            resolve(count.result)
            db.close()
          }
          count.onerror = () => reject(count.error)
        }
      })
  )
}

test.describe('offline', () => {
  test.beforeEach(({ browserName }) => {
    // See e2e/offline.spec.ts: Playwright's Linux WebKit can't drive a
    // service-worker reload. Real-iPhone offline stays a manual check.
    test.skip(browserName === 'webkit', "Playwright WebKit can't drive service-worker reloads")
  })

  test('works offline after a single visit, including the lazily loaded library', async ({ page, context }) => {
    await page.goto('/')
    await dismissWelcome(page)
    await waitForWorker(page)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()

    // The library chunk was never requested online; the install precached it.
    await page.getByRole('link', { name: 'Library' }).click()
    await expect(page.getByText(/\d+ exercises/).first()).toBeVisible()

    await page.getByRole('link', { name: 'Today' }).click()
    await page.getByRole('link', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await expect(page.getByText(/Set 1 of/)).toBeVisible()
    await context.setOffline(false)
  })

  test('a workout started online resumes and finishes with the network off', async ({ page, context }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await dismissWelcome(page)
    await waitForWorker(page)
    await startQuick10(page)
    await page.getByRole('button', { name: 'Complete Set' }).click()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('timer')).toBeVisible()
    await finishWorkout(page)
    await page.getByRole('link', { name: 'Back to Today' }).click()
    await expect(page.getByText('1 workout this week')).toBeVisible()
    await context.setOffline(false)
  })
})

test("importing another person's backup keeps this person's workouts", async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await dismissWelcome(page)

  // "Me" works out and makes a backup.
  await startQuick10(page)
  await finishWorkout(page)
  const meEvents = await countEvents(page)
  await page.goto('/#/settings')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export data' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^workout-app-backup-me-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = await download.path()
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  expect(backup.profile.name).toBe('Me')

  // Kay, on the same device, has their own workout. Their event ids differ from
  // Me's, but the auto-increment seq numbers are the same ones.
  await page.getByRole('button', { name: /Profile: Me/ }).click()
  await page.getByRole('button', { name: '+ Add a person' }).click()
  await page.getByPlaceholder('Their name').fill('Kay')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()
  await dismissWelcome(page)
  await startQuick10(page)
  await finishWorkout(page)
  const kayEvents = await countEvents(page)

  // Import asks first and says whose backup this is.
  await page.goto('/#/settings')
  await page.locator('input[type="file"]').setInputFiles(backupPath)
  const sheet = page.getByRole('dialog', { name: 'Import backup' })
  await expect(sheet.getByText('Add this backup to Kay?')).toBeVisible()
  await expect(sheet.getByText("This is Me's backup")).toBeVisible()
  await expect(sheet.getByText(/Kay's progress, routines and settings stay as they are/)).toBeVisible()
  // Wait for the reload import triggers, so the checks below read the new
  // page (the old page's profile button would otherwise pass them early).
  await Promise.all([page.waitForEvent('load'), sheet.getByRole('button', { name: 'Add their workouts' }).click()])

  // The page reloads; nothing of Kay's was overwritten.
  await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()
  await expect.poll(() => countEvents(page)).toBe(kayEvents + meEvents)
  await page.getByRole('link', { name: 'Today' }).click()
  await expect(page.getByText('2 workouts this week')).toBeVisible()
})
