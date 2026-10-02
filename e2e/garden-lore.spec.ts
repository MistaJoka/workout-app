import { expect, test, type Page } from '@playwright/test'
import { GARDEN_SPECIES, speciesFor, type Rarity } from '../src/domain/progress/garden'
import { GARDEN_LORE } from '../src/domain/progress/gardenLore'

// Lore cards: tapping a species tile in the garden grid opens a bottom
// sheet with its lore line, rarity, first-grown date and grown count for a
// discovered species, or a gentle "not found yet" card (rarity hint only,
// no name) for one that hasn't grown yet. Seeds sessionResults straight
// into IndexedDB, same technique as e2e/meadow.spec.ts and
// e2e/garden-sets.spec.ts, so species can be grown without playing real
// workouts.

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

// Session ids that grow a given species, found by scanning a deterministic
// id sequence (speciesFor is a pure hash, so this always finds the same
// ids for a given prefix).
function idsForSpecies(speciesId: string, count: number, prefix: string): string[] {
  const found: string[] = []
  for (let i = 0; found.length < count && i < 200_000; i++) {
    const id = `${prefix}-${i}`
    if (speciesFor(id).id === speciesId) found.push(id)
  }
  if (found.length !== count) throw new Error(`could not find ${count} ids for ${speciesId}`)
  return found
}

function idsForTier(rarity: Rarity, prefix: string): string[] {
  const species = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
  const chosen = new Map<string, string>()
  for (let i = 0; chosen.size < species.length && i < 100_000; i++) {
    const id = `${prefix}-${i}`
    const s = speciesFor(id)
    if (s.rarity === rarity && !chosen.has(s.id)) chosen.set(s.id, id)
  }
  if (chosen.size !== species.length) throw new Error(`could not find ids for every ${rarity} species`)
  return species.map((s) => chosen.get(s.id)!)
}

// One session per week (never two in the same Monday-start week): with the
// default weekly goal of 2, discovered counts/species here must stay
// exactly the seeded ones, not also pick up a goal bloom's bonus species
// (garden.ts/goalBloom.ts).
function seedsFor(ids: string[], startDay: number): Seed[] {
  return ids.map((sessionId, i) => ({
    sessionId,
    endedAt: new Date(Date.UTC(2026, 0, startDay + i * 7, 10, 0, 0)).toISOString(),
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

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

test('tapping a discovered species opens a lore card with its name, rarity, lore line, first-grown date and grown count', async ({
  page,
}) => {
  await openGarden(page)
  const species = GARDEN_SPECIES.find((s) => s.rarity === 'common')!
  const ids = idsForSpecies(species.id, 3, 'e2e-lore-common')
  const seeds = seedsFor(ids, 2)
  await seedSessions(page, seeds)
  await reloadGarden(page)

  const tile = page.getByRole('listitem', { name: new RegExp(`^${species.name}, Common, grown 3 times$`) })
  await expect(tile).toBeVisible()
  await tile.getByRole('button').click()

  const sheet = page.getByTestId('lore-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText(species.name, { exact: true })).toBeVisible()
  await expect(sheet.getByText('Common', { exact: true })).toBeVisible()
  await expect(sheet.getByText(GARDEN_LORE[species.id])).toBeVisible()
  await expect(sheet.getByText(`First grown ${formatShort(seeds[0].endedAt)}`)).toBeVisible()
  await expect(sheet.getByText('Grown 3 times')).toBeVisible()
  // Not yet a complete set: the pot in the card isn't golden.
  await expect(sheet.locator('svg').first()).not.toHaveAttribute('aria-label', /golden pot/)

  // The close button dismisses it.
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('lore-sheet')).toHaveCount(0)
})

test('tapping an undiscovered species opens a gentle card with only a rarity hint, never the name', async ({ page }) => {
  await openGarden(page)
  const legendary = GARDEN_SPECIES.find((s) => s.rarity === 'legendary')!

  const tile = page.getByRole('listitem', { name: 'Not found yet, Legendary' })
  await expect(tile).toBeVisible()
  await tile.getByRole('button').click()

  const sheet = page.getByTestId('lore-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Not found yet', { exact: false })).toBeVisible()
  await expect(sheet.getByText('keep growing', { exact: false })).toBeVisible()
  await expect(sheet.getByText('Legendary!', { exact: true })).toBeVisible()
  // The real name and lore never leak before it's found.
  await expect(sheet.getByText(legendary.name, { exact: true })).toHaveCount(0)
  await expect(sheet.getByText(GARDEN_LORE[legendary.id])).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('lore-sheet')).toHaveCount(0)
})

test('a completed tier shows a golden pot on its lore cards', async ({ page }) => {
  await openGarden(page)
  const commons = idsForTier('common', 'e2e-lore-tier')
  await seedSessions(page, seedsFor(commons, 1))
  await reloadGarden(page)

  const first = GARDEN_SPECIES.find((s) => s.rarity === 'common')!
  const tile = page.getByRole('listitem', { name: new RegExp(`^${first.name}, Common, grown 1 time, set complete$`) })
  await tile.getByRole('button').click()

  const sheet = page.getByTestId('lore-sheet')
  await expect(sheet.locator('svg').first()).toHaveAttribute('aria-label', /in a golden pot/)
})

test('a rare species shows its rarity in the card', async ({ page }) => {
  await openGarden(page)
  const rare = GARDEN_SPECIES.find((s) => s.rarity === 'rare')!
  const [id] = idsForSpecies(rare.id, 1, 'e2e-lore-rare')
  await seedSessions(page, seedsFor([id], 5))
  await reloadGarden(page)

  const tile = page.getByRole('listitem', { name: new RegExp(`^${rare.name}, Rare, grown 1 time$`) })
  await tile.getByRole('button').click()

  const sheet = page.getByTestId('lore-sheet')
  await expect(sheet.getByText('Rare!', { exact: true })).toBeVisible()
  await expect(sheet.getByText(GARDEN_LORE[rare.id])).toBeVisible()
})

test('with motion off, the lore card is still there at once', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await openGarden(page)
  const legendary = GARDEN_SPECIES.find((s) => s.rarity === 'legendary')!

  const tile = page.getByRole('listitem', { name: 'Not found yet, Legendary' })
  await tile.getByRole('button').click()
  await expect(page.getByTestId('lore-sheet')).toBeVisible({ timeout: 1_000 })
})
