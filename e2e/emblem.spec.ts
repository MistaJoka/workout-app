import { expect, test, type Page } from '@playwright/test'
import { GARDEN_SPECIES, speciesFor } from '../src/domain/progress/garden'
import { dismissWelcome } from './helpers'

// A profile's emblem: a flower you've already grown, picked in Settings ->
// You -> Emblem, shown in place of the plain initial circle wherever a
// profile's identity appears. Session results are seeded straight into
// IndexedDB (same technique as e2e/garden-sets.spec.ts) so a species can be
// "discovered" without playing a full workout; speciesFor is a pure hash, so
// scanning deterministic ids always finds the same session id for a species.

const PINK = GARDEN_SPECIES.find((s) => s.id === 'pink-bloom')!

function idForSpecies(speciesId: string, salt: string): string {
  for (let i = 0; i < 100_000; i++) {
    const id = `${salt}-${i}`
    if (speciesFor(id).id === speciesId) return id
  }
  throw new Error(`could not find an id for species ${speciesId}`)
}

async function seedSessionResult(page: Page, dbName: string, sessionId: string, endedAt: string): Promise<void> {
  await page.evaluate(
    async ({ dbName, sessionId, endedAt }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('sessionResults', 'readwrite')
        tx.objectStore('sessionResults').put({
          sessionId,
          planId: 'fs.quick-10',
          status: 'COMPLETED',
          startedAt: endedAt,
          endedAt,
          totalSetsCompleted: 6,
          totalSetsPlanned: 6,
        })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { dbName, sessionId, endedAt }
  )
}

test("Settings -> You -> Emblem offers only discovered species; picking one shows it in Settings, the switcher, and Today's greeting", async ({
  page,
}) => {
  await page.goto('/')
  await dismissWelcome(page)

  // A real name, so the greeting shows it ("Me" never does), and one grown
  // flower so there is something to pick.
  await page.evaluate(() => {
    localStorage.setItem(
      'workout-app:profiles',
      JSON.stringify({ profiles: [{ id: 'default', name: 'Alex' }], activeId: 'default' })
    )
  })
  await seedSessionResult(
    page,
    'workout-app-v06',
    idForSpecies(PINK.id, 'e2e-emblem-pink'),
    new Date(Date.UTC(2026, 0, 1, 10, 0, 0)).toISOString()
  )

  await page.goto('/#/settings')
  await expect(page.getByRole('button', { name: /Profile: Alex/ })).toBeVisible()

  const emblemRow = page.getByRole('button', { name: 'Emblem' })
  await expect(emblemRow).toBeVisible()
  await expect(emblemRow.locator('svg')).toHaveCount(0) // plain dash: no emblem set yet

  await emblemRow.click()
  const sheet = page.getByRole('dialog', { name: 'Choose an emblem' })
  await expect(sheet).toBeVisible()

  // Only the one discovered species is offered, alongside None — the app
  // has fifteen species total, so this proves undiscovered ones are held
  // back. (Scoped to the choice grid: the sheet also has a Close button.)
  await expect(sheet.locator('.grid button')).toHaveCount(2)
  const noneButton = sheet.getByRole('button', { name: 'None' })
  const pinkButton = sheet.getByRole('button', { name: new RegExp(PINK.name) })
  await expect(noneButton).toHaveAttribute('aria-pressed', 'true')
  await expect(pinkButton).toBeVisible()
  // A real touch target, not a decorative sliver.
  const box = await pinkButton.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)

  await pinkButton.click()
  await expect(sheet).toBeHidden()
  await expect(emblemRow.locator('svg')).toHaveCount(1)

  // Reopening shows the selection ring on the chosen species.
  await emblemRow.click()
  await expect(sheet.getByRole('button', { name: new RegExp(PINK.name) })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'false')
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()

  // The profile switcher's trigger row shows the emblem instead of the initial.
  await expect(page.getByRole('button', { name: /Profile: Alex/ }).locator('svg')).toHaveCount(1)

  // Today's greeting carries a tiny emblem next to the name, one line.
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: /Good.*Alex/ })).toBeVisible()
  await expect(page.locator('header h1 svg')).toHaveCount(1)

  // It's stored on the profile record, so it survives a real reload.
  await page.reload()
  await expect(page.locator('header h1 svg')).toHaveCount(1)

  // Back in Settings, None clears it back to the plain circle everywhere.
  await page.goto('/#/settings')
  await emblemRow.click()
  await sheet.getByRole('button', { name: 'None' }).click()
  await expect(sheet).toBeHidden()
  await expect(emblemRow.locator('svg')).toHaveCount(0)
  await page.goto('/#/')
  await expect(page.locator('header h1 svg')).toHaveCount(0)
})

test("the picker shows a profile's emblem, or the plain initial when none is set", async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'workout-app:profiles',
      JSON.stringify({
        profiles: [
          { id: 'default', name: 'Me' },
          { id: 'kay12345', name: 'Kay', emblem: 'sky-daisy' },
        ],
        activeId: 'default',
      })
    )
    localStorage.setItem('workout-app:profile-picked', '2000-01-01')
  })
  await page.reload()

  const picker = page.getByRole('dialog', { name: "Who's working out?" })
  await expect(picker).toBeVisible()
  await expect(picker.getByRole('button', { name: /Me/ }).locator('svg')).toHaveCount(0)
  await expect(picker.getByRole('button', { name: /Kay/ }).locator('svg')).toHaveCount(1)
})
