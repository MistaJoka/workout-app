import { expect, test, type Page } from '@playwright/test'

// Writes sessionResults straight into this profile's database: the fastest
// honest way to grow many flowers without playing dozens of real workouts
// (same technique as e2e/sessions.spec.ts's seedProgression). The app must
// have opened its database at least once first (a prior page.goto), so the
// store already exists when we open it raw.
async function seedSessions(page: Page, sessions: { sessionId: string; endedAt: string }[]): Promise<void> {
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

// One session per week (never two in the same Monday-start week): with the
// default weekly goal of 2, these counts must stay exact flower counts, not
// also trip a goal bloom bonus flower (garden.ts/goalBloom.ts).
function sessions(n: number): { sessionId: string; endedAt: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    sessionId: `meadow-seed-${i}`,
    endedAt: new Date(Date.UTC(2026, 0, 1 + i * 7, 10, 0, 0)).toISOString(),
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

test('with no finished workouts the meadow is empty but inviting', async ({ page }) => {
  await openGarden(page)
  const meadow = page.getByTestId('meadow')
  await expect(meadow).toBeVisible()
  await expect(meadow.getByText('Your first workout plants the first flower.')).toBeVisible()
  await expect(page.getByTestId('meadow-flower')).toHaveCount(0)
})

test('every finished workout plants an openable flower, oldest at the back', async ({ page }) => {
  await openGarden(page)
  const seed = sessions(3)
  await seedSessions(page, seed)
  await reloadGarden(page)

  const flowers = page.getByTestId('meadow-flower')
  await expect(flowers).toHaveCount(3)
  // Oldest-first document order: the first flower drawn is the first ever grown.
  await expect(flowers.nth(0)).toHaveAttribute('data-session-id', seed[0].sessionId)
  await expect(flowers.nth(2)).toHaveAttribute('data-session-id', seed[2].sessionId)
  await expect(flowers.nth(0)).toHaveAttribute('href', `#/history/${seed[0].sessionId}`)

  // Tapping a flower opens that workout's detail.
  await flowers.nth(2).click()
  await expect(page).toHaveURL(new RegExp(`#/history/${seed[2].sessionId}$`))
})

test('placement never reshuffles as more flowers grow in', async ({ page }) => {
  await openGarden(page)
  await seedSessions(page, sessions(3))
  await reloadGarden(page)
  const first = page.getByTestId('meadow-flower').first()
  const styleBefore = await first.getAttribute('style')

  await seedSessions(page, sessions(10).slice(3))
  await reloadGarden(page)
  const firstAfter = page.getByTestId('meadow-flower').first()
  await expect(firstAfter).toHaveAttribute('data-session-id', 'meadow-seed-0')
  expect(await firstAfter.getAttribute('style')).toBe(styleBefore)
})

test('a large garden spreads across rows and lists every flower', async ({ page }) => {
  test.setTimeout(60_000)
  await openGarden(page)
  await seedSessions(page, sessions(32))
  await reloadGarden(page)

  await expect(page.getByTestId('meadow-flower')).toHaveCount(32)
  const rowCount = await page.getByTestId('meadow-row').count()
  expect(rowCount).toBeGreaterThan(1)

  const disclosure = page.getByText('Every flower (32)')
  await expect(disclosure).toBeVisible()
  await disclosure.click()
  const listLinks = page.locator('.meadow__list ul li a')
  await expect(listLinks).toHaveCount(32)
  // The list reads newest first.
  await expect(listLinks.first()).toHaveAttribute('href', '#/history/meadow-seed-31')
})

test('with motion off every flower is still there, just not swaying', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off' }).click()
  await openGarden(page)
  await seedSessions(page, sessions(3))
  await reloadGarden(page)
  await expect(page.getByTestId('meadow-flower')).toHaveCount(3)
})

test('the species collection grid below the meadow is unchanged', async ({ page }) => {
  await openGarden(page)
  await expect(page.getByText(/kinds found/)).toBeVisible()
  await expect(page.getByRole('listitem', { name: /^Not found yet/ })).toHaveCount(15)
})
