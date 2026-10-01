import { expect, test, type Page } from '@playwright/test'
import { GARDEN_SPECIES, speciesFor, type Rarity } from '../src/domain/progress/garden'

// Sets: each rarity tier (Commons/Uncommons/Rares/Legendary) is its own
// small collection to complete. These tests seed sessionResults straight
// into IndexedDB (same technique as e2e/meadow.spec.ts's seedSessions) so a
// tier can be completed without playing dozens of real workouts, then check
// the Sets section, the grouped species grid, golden pots (grid + meadow),
// and the one-time completion celebration.

type Seed = { sessionId: string; endedAt: string }

async function seedSessions(page: Page, sessions: Seed[]): Promise<void> {
  await page.evaluate(async (seed) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessionResults', 'readwrite')
      for (const s of seed) {
        tx.objectStore('sessionResults').put({
          sessionId: s.sessionId,
          planId: 'fs.quick-10',
          status: 'COMPLETED',
          startedAt: s.endedAt,
          endedAt: s.endedAt,
          totalSetsCompleted: 6,
          totalSetsPlanned: 6,
        })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, sessions)
}

// One sessionId per species of a tier, found by scanning a deterministic id
// sequence (speciesFor is a pure hash, so this always finds the same ids).
function idsForTier(rarity: Rarity): string[] {
  const species = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
  const chosen = new Map<string, string>()
  for (let i = 0; chosen.size < species.length && i < 100_000; i++) {
    const id = `e2e-tier-${rarity}-${i}`
    const s = speciesFor(id)
    if (s.rarity === rarity && !chosen.has(s.id)) chosen.set(s.id, id)
  }
  if (chosen.size !== species.length) throw new Error(`could not find ids for every ${rarity} species`)
  return species.map((s) => chosen.get(s.id)!)
}

function seedsFor(ids: string[], startDay: number): Seed[] {
  return ids.map((sessionId, i) => ({
    sessionId,
    endedAt: new Date(Date.UTC(2026, 0, startDay + i, 10, 0, 0)).toISOString(),
  }))
}

async function openGarden(page: Page): Promise<void> {
  await page.goto('/#/garden')
  await expect(page.getByRole('heading', { name: 'Your garden' })).toBeVisible()
}

async function reloadGarden(page: Page): Promise<void> {
  // A hash-only navigation doesn't reload the document.
  await page.goto('about:blank')
  await openGarden(page)
}

test('a partial garden shows each tier under Sets and groups the species grid by tier', async ({ page }) => {
  await openGarden(page)
  const commons = idsForTier('common').slice(0, 3)
  const uncommons = idsForTier('uncommon').slice(0, 2)
  await seedSessions(page, [...seedsFor(commons, 1), ...seedsFor(uncommons, 10)])
  await reloadGarden(page)

  const sets = page.getByRole('region', { name: 'Sets' })
  await expect(sets).toBeVisible()
  await expect(sets.getByRole('progressbar', { name: 'Commons: 3 of 8' })).toBeVisible()
  await expect(sets.getByRole('progressbar', { name: 'Uncommons: 2 of 4' })).toBeVisible()
  await expect(sets.getByRole('progressbar', { name: 'Rares: 0 of 2' })).toBeVisible()
  await expect(sets.getByRole('progressbar', { name: 'Legendary: 0 of 1' })).toBeVisible()
  // None complete yet: no gold badge, no celebration.
  await expect(page.getByTestId('garden-set-celebration')).toHaveCount(0)

  // The species grid is grouped by tier, with a heading per tier.
  for (const heading of ['Commons', 'Uncommons', 'Rares', 'Legendary']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  // All 15 species still show up as list items, split not lost across groups.
  const allSpeciesItems = page.locator('ul.grid > li')
  await expect(allSpeciesItems).toHaveCount(15)
})

test('completing a tier turns its pots gold, shows a badge with its date, and celebrates once', async ({ page }) => {
  await openGarden(page)
  const commons = idsForTier('common')
  const seeds = seedsFor(commons, 1)
  await seedSessions(page, seeds)
  await reloadGarden(page)

  // Sets row: complete, with the date of the session that finished it.
  const sets = page.getByRole('region', { name: 'Sets' })
  await expect(sets.getByRole('progressbar', { name: 'Commons: 8 of 8, complete' })).toBeVisible()
  const lastEndedAt = seeds[seeds.length - 1].endedAt
  const expectedDate = new Date(lastEndedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  await expect(sets.getByText(expectedDate)).toBeVisible()

  // A found common species in the grid is marked as part of a complete set.
  const firstCommon = GARDEN_SPECIES.find((s) => s.rarity === 'common')!
  await expect(page.getByRole('listitem', { name: new RegExp(`^${firstCommon.name}, Common, grown 1 time, set complete$`) })).toBeVisible()

  // The meadow's flowers for this species grow in golden pots.
  const meadowFlowers = page.getByTestId('meadow-flower')
  await expect(meadowFlowers.first().locator('svg')).toHaveAttribute('aria-label', /in a golden pot/)

  // The one-time celebration shows once, naming the tier.
  const celebration = page.getByTestId('garden-set-celebration')
  await expect(celebration).toBeVisible()
  await expect(celebration.getByText('Commons set complete!')).toBeVisible()
  await celebration.getByRole('button', { name: 'Dismiss' }).click()
  await expect(celebration).toHaveCount(0)

  // It never shows again on a later visit — but the Sets row stays complete.
  await reloadGarden(page)
  await expect(page.getByTestId('garden-set-celebration')).toHaveCount(0)
  await expect(sets.getByRole('progressbar', { name: 'Commons: 8 of 8, complete' })).toBeVisible()
})

test('with motion off, the completion celebration is still there at once', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await openGarden(page)
  const legendary = idsForTier('legendary')
  await seedSessions(page, seedsFor(legendary, 1))
  await reloadGarden(page)

  await expect(page.getByTestId('garden-set-celebration')).toBeVisible({ timeout: 1_000 })
  await expect(page.getByText('Legendary set complete!')).toBeVisible()
})
