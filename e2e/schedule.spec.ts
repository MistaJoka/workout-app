import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.describe('schedule and reminders', () => {
  test('plan a week, then export it to Calendar as an .ics file', async ({ page }) => {
    // Force the download path (no share sheet in headless Chromium anyway).
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true })
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/#/schedule')
    await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible()
    // Nothing to remind about yet.
    await expect(page.getByRole('button', { name: 'Add to Calendar' })).toBeHidden()

    await page.getByRole('button', { name: /^Monday/ }).click()
    await page.getByRole('radio', { name: 'Full-Body A' }).click()
    await page.getByRole('button', { name: /^Wednesday/ }).click()
    await page.getByRole('radio', { name: 'Rest' }).click()
    await expect(page.getByRole('button', { name: /^Monday/ })).toContainText('Full-Body A')

    await page.getByRole('radio', { name: '7 AM' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Add to Calendar' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('workout-week.ics')
    const ics = await readFile((await download.path())!, 'utf8')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(ics).toContain('SUMMARY:Full-Body A')
    expect(ics).toMatch(/DTSTART:\d{8}T070000/)
    expect(ics).not.toContain('BYDAY=WE')
    await expect(page.getByRole('status')).toHaveText('Open the file to add your week to Calendar.')

    // The plan survives a reload.
    await page.goto('about:blank')
    await page.goto('/#/schedule')
    await expect(page.getByRole('button', { name: /^Monday/ })).toContainText('Full-Body A')
    await expect(page.getByRole('button', { name: /^Wednesday/ })).toContainText('Rest')
  })

  test('deleting a routine clears it from the days it was planned on', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Temp Day')
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder('Search exercises').fill('mini squat')
    await page.getByRole('button', { name: /Mini Squat/ }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByRole('heading', { name: 'Temp Day' })).toBeVisible()

    await page.goto('/#/schedule')
    await page.getByRole('button', { name: /^Friday/ }).click()
    await page.getByRole('radio', { name: 'Temp Day' }).click()
    await expect(page.getByRole('button', { name: /^Friday/ })).toContainText('Temp Day')

    await page.goto('/#/library')
    await page.getByRole('link', { name: /Temp Day/ }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Yes, delete' }).click()
    await expect(page.getByPlaceholder('Search exercises')).toBeVisible()

    await page.goto('/#/schedule')
    await expect(page.getByRole('button', { name: /^Friday/ })).toContainText('Not planned')
  })

  test('the draft Rae workouts are offered alongside the starter ones', async ({ page }) => {
    await page.goto('/#/library')
    for (const name of ['Warm-up', 'Cool-down', 'Chair day']) {
      await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
    }
    await page.goto('/#/checkin/draft.chair-day')
    await expect(page.getByRole('heading', { name: 'Chair day' })).toBeVisible()
    await expect(page.getByText('Chair Sit-to-Stand, Arms Forward')).toBeVisible()
  })
})

test.describe('sheet accessibility', () => {
  test('the filter sheet takes focus, closes on Escape and hands focus back', async ({ page }) => {
    await page.goto('/#/library')
    const trigger = page.getByRole('button', { name: /^Filters/ })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    // Tab never leaves the sheet.
    for (let i = 0; i < 25; i++) await page.keyboard.press('Tab')
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('a confirm sheet focuses the safe choice and Escape cancels', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Half done')
    await page.getByRole('button', { name: /Back/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Leave without saving?' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Keep editing' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(page.getByPlaceholder('Routine name')).toHaveValue('Half done')
  })
})
