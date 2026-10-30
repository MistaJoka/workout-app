import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { crc32, deflateSync } from 'node:zlib'
import { dismissWelcome, openProgressMore } from './helpers'

// Owner decisions 2026-10-29: other activities count toward the week,
// body measurements sit beside body weight, progress photos stay on the
// phone and travel only inside a backup. One journey through all three,
// then the backup restores every one of them on a fresh device.

// A small solid-color PNG, generated here rather than shipped as a fixture.
function png(width: number, height: number, rgb: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())])
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const PNG_SMALL = png(4, 3, [255, 105, 180])

async function openBodyTab(page: Page, name: 'Body weight' | 'Body measurements' | 'Progress photos'): Promise<void> {
  await openProgressMore(page)
  await page.getByTestId('body-panel').getByRole('tab', { name }).click()
}

test('log an activity, a measurement and a photo, then back them up and restore them', async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await dismissWelcome(page)
  await expect(page.getByRole('link', { name: 'Goal: 2 this week. Plan your week.' })).toBeVisible()

  // Other activity, from Today's workout row: it moves the week.
  await page.getByRole('link', { name: /^Log other activity/ }).click()
  await page.getByRole('button', { name: 'Walk', exact: true }).click()
  await page.getByRole('button', { name: '45 minutes' }).click()
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('button', { name: /^Save Walk, 45 minutes/ }).click()
  await expect(page.getByRole('link', { name: '1 of 2 this week. Plan your week.' })).toBeVisible()

  // Progress counts it too, and lists it apart from app workouts.
  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByText('1 of 2 this week').first()).toBeAttached()
  await openProgressMore(page)
  const activity = page.getByTestId('history-activity')
  await expect(activity).toHaveCount(1)
  await expect(activity).toContainText('Walk')
  await expect(activity).toContainText('45 min')

  // A measurement (the unit setting is lb, so inches).
  await openBodyTab(page, 'Body measurements')
  await page.getByRole('button', { name: 'Log measurements' }).click()
  await page.getByRole('textbox', { name: 'Waist, inches' }).fill('30')
  await page.getByRole('button', { name: 'Save today' }).click()
  await expect(page.getByTestId('measurements').getByLabel('Waist: 30 in')).toBeVisible()

  // A photo from the gallery: re-encoded on the phone, shown in the gallery.
  await openBodyTab(page, 'Progress photos')
  await page.getByTestId('photo-gallery-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG_SMALL })
  await expect(page.getByTestId('photo-preview').getByRole('listitem')).toHaveCount(1)
  await page.getByRole('link', { name: 'All photos, 1' }).click()
  await expect(page.getByTestId('photo-gallery').getByRole('listitem')).toHaveCount(1)
  await expect(page.getByTestId('photo-gallery').locator('img')).toHaveJSProperty('complete', true)

  // Backup: the note says photos are in it, and they are (as JPEG).
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByTestId('backup-photos-note')).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save a backup' }).click()
  const backupPath = await (await downloading).path()
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  expect(backup.activities).toEqual([expect.objectContaining({ kind: 'walk', minutes: 45, deletedAt: null })])
  expect(backup.bodyMeasurements).toEqual([expect.objectContaining({ waistCm: 76.2 })])
  expect(backup.progressPhotos).toHaveLength(1)
  expect(backup.progressPhotos[0].dataBase64.startsWith('/9j/')).toBe(true)

  // A fresh device: import the backup and everything comes back.
  const fresh = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const other = await fresh.newPage()
  await other.goto('/')
  await dismissWelcome(other)
  await other.goto('/#/settings')
  await other.locator('input[type="file"][accept="application/json"]').setInputFiles(backupPath)
  const sheet = other.getByRole('dialog', { name: 'Import backup' })
  await Promise.all([other.waitForEvent('load'), sheet.getByRole('button', { name: /^Add to / }).click()])

  await other.goto('/#/progress')
  await expect(other.getByText('1 of 2 this week').first()).toBeAttached()
  await openProgressMore(other)
  await expect(other.getByTestId('history-activity')).toContainText('Walk')
  await openBodyTab(other, 'Body measurements')
  await expect(other.getByTestId('measurements').getByLabel('Waist: 30 in')).toBeVisible()
  await openBodyTab(other, 'Progress photos')
  await expect(other.getByTestId('photo-preview').getByRole('listitem')).toHaveCount(1)
  await fresh.close()
})

test('an activity can be deleted after confirming, and the week goes back', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.goto('/#/activity')
  await page.getByRole('button', { name: 'Yoga', exact: true }).click()
  await page.locator('[data-armed="true"]').waitFor()
  await page.getByRole('button', { name: /^Save Yoga/ }).click()
  await page.goto('/#/progress')
  await openProgressMore(page)
  await page.getByRole('button', { name: /^Delete Yoga, 30 min/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Delete this activity?' })
  await sheet.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByTestId('history-activity')).toHaveCount(0)
  await expect(page.getByText('Goal: 2 this week').first()).toBeAttached()
})

test('photos compare side by side, and delete after confirming', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.goto('/#/photos')
  const input = page.getByTestId('photo-gallery-input')
  await input.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_SMALL })
  await expect(page.getByTestId('photo-gallery').getByRole('listitem')).toHaveCount(1)
  await input.setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG_SMALL })
  await expect(page.getByTestId('photo-gallery').getByRole('listitem')).toHaveCount(2)

  await page.getByRole('button', { name: 'Compare two photos side by side' }).click()
  const tiles = page.getByTestId('photo-gallery').getByRole('button')
  await tiles.nth(0).click()
  await tiles.nth(1).click()
  const compare = page.getByTestId('photo-compare')
  await expect(compare.locator('img')).toHaveCount(2)
  await compare.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Compare two photos side by side' }).click()
  await tiles.nth(0).click()
  await page.getByRole('dialog', { name: /^Photo from/ }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete this photo?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByTestId('photo-gallery').getByRole('listitem')).toHaveCount(1)
})
