import { expect, test, type Page } from '@playwright/test'

// Writes sessionResults straight into this profile's database, the same
// technique as e2e/meadow.spec.ts's seedSessions: the fastest honest way to
// grow a garden of a given size without playing real workouts. The app must
// have opened its database at least once first (a prior page.goto).
async function seedSessions(page: Page, n: number): Promise<void> {
  // One session per week (never two in the same Monday-start week): with
  // the default weekly goal of 2, these counts must stay exact flower
  // counts, not also trip a goal bloom bonus flower (garden.ts/goalBloom.ts).
  const seed = Array.from({ length: n }, (_, i) => ({
    sessionId: `critter-seed-${i}`,
    endedAt: new Date(Date.UTC(2026, 0, 1 + i * 7, 10, 0, 0)).toISOString(),
  }))
  await page.evaluate(async (sessions) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessionResults', 'readwrite')
      for (const s of sessions) {
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
  }, seed)
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

test('an empty meadow has no critters', async ({ page }) => {
  await openGarden(page)
  await expect(page.getByTestId('meadow-critter')).toHaveCount(0)
})

test('1-4 flowers draw one butterfly and nothing else', async ({ page }) => {
  await openGarden(page)
  await seedSessions(page, 3)
  await reloadGarden(page)

  const critters = page.getByTestId('meadow-critter')
  await expect(critters).toHaveCount(1)
  await expect(critters.first()).toHaveAttribute('data-kind', 'butterfly')
})

test('5-14 flowers add a bee', async ({ page }) => {
  await openGarden(page)
  await seedSessions(page, 10)
  await reloadGarden(page)

  const critters = page.getByTestId('meadow-critter')
  await expect(critters).toHaveCount(2)
  await expect(page.locator('[data-testid="meadow-critter"][data-kind="butterfly"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="meadow-critter"][data-kind="bee"]')).toHaveCount(1)
})

test('15+ flowers add a ladybug too, and the cast never grows past that', async ({ page }) => {
  await openGarden(page)
  await seedSessions(page, 20)
  await reloadGarden(page)

  const critters = page.getByTestId('meadow-critter')
  await expect(critters).toHaveCount(3)
  await expect(page.locator('[data-testid="meadow-critter"][data-kind="butterfly"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="meadow-critter"][data-kind="bee"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="meadow-critter"][data-kind="ladybug"]')).toHaveCount(1)

  // Critters are decoration, not a tap target: a flower underneath one
  // still opens its workout.
  await page.getByTestId('meadow-flower').first().click()
  await expect(page).toHaveURL(/#\/history\/critter-seed-0$/)
})

test('critters never reshuffle: the butterfly already visible keeps its exact spot as the garden grows', async ({
  page,
}) => {
  await openGarden(page)
  await seedSessions(page, 3)
  await reloadGarden(page)
  const butterfly = page.locator('[data-testid="meadow-critter"][data-kind="butterfly"]')
  const styleBefore = await butterfly.getAttribute('style')

  await seedSessions(page, 20)
  await reloadGarden(page)
  const butterflyAfter = page.locator('[data-testid="meadow-critter"][data-kind="butterfly"]')
  expect(await butterflyAfter.getAttribute('style')).toBe(styleBefore)
})

test('with motion off, critters are still there but hold still', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await openGarden(page)
  await seedSessions(page, 20)
  await reloadGarden(page)

  const critters = page.getByTestId('meadow-critter')
  await expect(critters).toHaveCount(3)

  // No running animation anywhere in the critter layer: the flight/crawl
  // layer itself, and the wing-flap frames inside it.
  const animationNames = await page.evaluate(() => {
    const names: string[] = []
    document.querySelectorAll('[data-testid="meadow-critter"]').forEach((el) => {
      names.push(getComputedStyle(el as Element).animationName)
      el.querySelectorAll('*').forEach((child) => names.push(getComputedStyle(child).animationName))
    })
    return names
  })
  for (const name of animationNames) {
    expect(name).toBe('none')
  }
})

test('with motion full, the critter layer and wings are actually animating', async ({ page }) => {
  await openGarden(page)
  await seedSessions(page, 20)
  await reloadGarden(page)

  const animationNames = await page.evaluate(() => {
    const flying = document.querySelector('.meadow-critter__fly')
    const wingsOpen = document.querySelector('.meadow-critter__fly .critter__wings-open')
    return {
      flying: flying ? getComputedStyle(flying).animationName : null,
      wingsOpen: wingsOpen ? getComputedStyle(wingsOpen).animationName : null,
    }
  })
  expect(animationNames.flying).toBe('meadow-critter-drift')
  expect(animationNames.wingsOpen).toBe('meadow-critter-flap')
})
