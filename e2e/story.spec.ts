import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Rae's garden story: short chapters unlocked as finished workouts stack
// up. Seeds sessionResults straight into IndexedDB for the multi-workout
// cases (same technique as e2e/garden-lore.spec.ts), so chapters can unlock
// without playing out real workouts; the first test drives one real
// workout end to end to prove the whole wire-up actually works.

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

function seeds(count: number): Seed[] {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: `e2e-story-${i}`,
    endedAt: new Date(Date.UTC(2026, 0, 2 + i, 10, 0, 0)).toISOString(),
  }))
}

async function reload(page: Page, hash: string): Promise<void> {
  // A hash-only navigation doesn't reload the document.
  await page.goto('about:blank')
  await page.goto(hash)
}

test('a first finished workout unlocks chapter one, offered on Today and readable in the story', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('/#/')
  const card = page.getByRole('link', { name: "New chapter: A Mysterious Seed. Open Rae's story" })
  await expect(card).toBeVisible()

  await card.click()
  await expect(page.getByRole('heading', { name: 'A Mysterious Seed' })).toBeVisible()
  await expect(page.getByText('Chapter 1 of 10')).toBeVisible()
  await expect(page.getByText(/windowsill/)).toBeVisible()

  // Reading it marks it seen: Today's card is gone, and the chapter list no
  // longer flags it "new".
  await reload(page, '/#/')
  await expect(page.getByRole('link', { name: /^New chapter:/ })).toHaveCount(0)

  await reload(page, '/#/story')
  await expect(page.getByRole('heading', { name: "Rae's story" })).toBeVisible()
  await expect(page.getByText('1 of 10 chapters')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Chapter 1: A Mysterious Seed, read' })).toBeVisible()
  await expect(
    page.getByRole('listitem', { name: 'Chapter 2: The First Sprout, locked, unlocks after 2 workouts' })
  ).toBeVisible()
})

test('locked chapters show a soft lock and count down to the next one', async ({ page }) => {
  await page.goto('/#/story')
  await seedSessions(page, seeds(4))
  await reload(page, '/#/story')

  await expect(page.getByText('3 of 10 chapters · 1 more workout to the next one')).toBeVisible()
  await expect(page.getByRole('link', { name: /^Chapter 1: A Mysterious Seed/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Chapter 2: The First Sprout/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Chapter 3: A Rainy Day/ })).toBeVisible()
  await expect(
    page.getByRole('listitem', { name: 'Chapter 4: The Curious Bee, locked, unlocks after 5 workouts' })
  ).toBeVisible()
})

test('the reader opens unlocked chapters, advances to the next one, and waits for a locked one', async ({ page }) => {
  await page.goto('/#/story')
  await seedSessions(page, seeds(2))
  await reload(page, '/#/story/1')

  await expect(page.getByRole('heading', { name: 'A Mysterious Seed' })).toBeVisible()
  const next = page.getByRole('link', { name: 'Next chapter' })
  await expect(next).toBeVisible()
  await next.click()

  await expect(page.getByRole('heading', { name: 'The First Sprout' })).toBeVisible()
  await expect(page.getByText('Chapter 2 of 10')).toBeVisible()
  // Only 2 workouts finished: chapter 3 needs a 3rd, so there's no button.
  await expect(page.getByRole('link', { name: 'Next chapter' })).toHaveCount(0)
  await expect(page.getByText('Next chapter unlocks after 3 workouts')).toBeVisible()
})

test('a locked chapter opened directly says when it unlocks instead of its story', async ({ page }) => {
  await page.goto('/#/story/5')
  await expect(page.getByText("This chapter hasn't unlocked yet.")).toBeVisible()
  await expect(page.getByText('Unlocks after 7 workouts.')).toBeVisible()
  await page.getByRole('link', { name: 'Back to the story' }).click()
  await expect(page.getByRole('heading', { name: "Rae's story" })).toBeVisible()
})

test("Progress shows a Rae's story tile that opens the story", async ({ page }) => {
  await page.goto('/#/progress')
  await seedSessions(page, seeds(3))
  await reload(page, '/#/progress')

  const tile = page.getByRole('link', { name: "Rae's story: 3 of 10 chapters. Open the story" })
  await expect(tile).toBeVisible()
  await tile.click()
  await expect(page.getByRole('heading', { name: "Rae's story" })).toBeVisible()
})
