import { expect, test } from '@playwright/test'
import { finishWorkout } from './helpers'

// The generalized share buttons added for badges and the garden (on top of
// the existing workout-complete card): stub the share sheet, decode the PNG
// it was handed inside the page (no file I/O needed) and check it's the
// card's fixed 1080x1350 size.
async function stubShareSheet(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __shares: unknown[] }).__shares = []
    Object.defineProperty(Navigator.prototype, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (data: { files?: File[] }) => {
        const file = data.files?.[0]
        let width: number | undefined
        let height: number | undefined
        if (file) {
          const bitmap = await createImageBitmap(file)
          width = bitmap.width
          height = bitmap.height
          bitmap.close()
        }
        ;(window as unknown as { __shares: unknown[] }).__shares.push({
          name: file?.name,
          type: file?.type,
          size: file?.size,
          width,
          height,
        })
      },
      configurable: true,
    })
  })
}

async function waitForShare(page: import('@playwright/test').Page, countAtLeast: number) {
  await page.waitForFunction((n) => (window as unknown as { __shares: unknown[] }).__shares.length >= n, countAtLeast)
  return page.evaluate(
    () => (window as unknown as { __shares: { name?: string; type?: string; size?: number; width?: number; height?: number }[] }).__shares
  )
}

test('sharing an unlocked badge, a badge from the collection, and the garden each hand over a 1080x1350 PNG', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await stubShareSheet(page)

  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  // 1) The newly-unlocked "First bloom" badge on Complete can be shared.
  const unlockShare = page.getByRole('button', { name: 'Share First bloom badge' })
  await expect(unlockShare).toBeVisible()
  await unlockShare.click()
  let shares = await waitForShare(page, 1)
  expect(shares[0]).toMatchObject({ type: 'image/png', width: 1080, height: 1350 })
  expect(shares[0].name).toMatch(/^badge-first-workout-\d{4}-\d{2}-\d{2}\.png$/)

  // 2) The same badge, shared again from the full collection.
  await page.goto('/#/achievements')
  await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible()
  const collectionShare = page.getByRole('button', { name: 'Share First bloom badge' })
  await expect(collectionShare).toBeVisible()
  await collectionShare.click()
  shares = await waitForShare(page, 2)
  expect(shares[1]).toMatchObject({ type: 'image/png', width: 1080, height: 1350 })
  expect(shares[1].name).toMatch(/^badge-first-workout-\d{4}-\d{2}-\d{2}\.png$/)

  // 3) The garden, shared from its header.
  await page.goto('/#/garden')
  await expect(page.getByRole('heading', { name: 'Your garden' })).toBeVisible()
  const gardenShare = page.getByRole('button', { name: 'Share your garden' })
  await expect(gardenShare).toBeVisible()
  await gardenShare.click()
  shares = await waitForShare(page, 3)
  expect(shares[2]).toMatchObject({ type: 'image/png', width: 1080, height: 1350 })
  expect(shares[2].name).toMatch(/^garden-\d{4}-\d{2}-\d{2}\.png$/)
})
