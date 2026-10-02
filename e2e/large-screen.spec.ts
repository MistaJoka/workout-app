import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

// Tablet/foldable width, and a landscape phone (iPhone-ish width, phone
// height) — both cross the ~640px breakpoint where the app stops
// stretching edge to edge and clamps to a centered phone-width column
// (index.css, "Large-screen column"; AppShell.tsx, RouteFade.tsx,
// ThumbBar.tsx, FilterSheet.tsx). Phone portrait (< 640px) is covered by
// every other spec and is intentionally untouched by that CSS.
const LARGE = { width: 1024, height: 768 }
const LANDSCAPE_PHONE = { width: 844, height: 390 }
const COLUMN_MAX = 600
// Borders/box-shadow and sub-pixel layout add a few px of slack.
const TOLERANCE = 6

function assertCenteredColumn(box: { x: number; width: number }, viewportWidth: number) {
  expect(box.width).toBeLessThanOrEqual(COLUMN_MAX + TOLERANCE)
  const center = box.x + box.width / 2
  expect(Math.abs(center - viewportWidth / 2)).toBeLessThanOrEqual(TOLERANCE)
}

test.describe('large screens', () => {
  test('1024x768: the column, tab bar and a sheet all stay centered and aligned', async ({ page }) => {
    await page.setViewportSize(LARGE)
    await page.goto('/')
    await dismissWelcome(page)

    const column = page.getByTestId('app-column')
    const columnBox = await column.boundingBox()
    if (!columnBox) throw new Error('app column not laid out')
    assertCenteredColumn(columnBox, LARGE.width)

    const nav = page.getByRole('navigation')
    const navBox = await nav.boundingBox()
    if (!navBox) throw new Error('tab bar not laid out')
    assertCenteredColumn(navBox, LARGE.width)
    // Not just independently centered — the tab bar lines up with the
    // content column's own left edge and width.
    expect(Math.abs(navBox.x - columnBox.x)).toBeLessThanOrEqual(TOLERANCE)
    expect(Math.abs(navBox.width - columnBox.width)).toBeLessThanOrEqual(TOLERANCE)

    // A sheet (Library's Filters, same shared sheet-backdrop/dialog
    // pattern as ConfirmSheet, FilterSheet's non-inline trigger, lore and
    // emblem sheets) clamps to the column too.
    await page.getByRole('link', { name: 'Library' }).click()
    await page.getByRole('button', { name: /^Filters/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await expect(sheet).toBeVisible()
    const sheetBox = await sheet.boundingBox()
    if (!sheetBox) throw new Error('sheet not laid out')
    assertCenteredColumn(sheetBox, LARGE.width)
  })

  test('844x390 landscape phone: nothing is clipped and a workout can start', async ({ page }) => {
    await page.setViewportSize(LANDSCAPE_PHONE)
    await page.goto('/')
    await dismissWelcome(page)

    // The column centering never introduces a horizontal scrollbar.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(LANDSCAPE_PHONE.width + 1)

    const nav = page.getByRole('navigation')
    const navBox = await nav.boundingBox()
    if (!navBox) throw new Error('tab bar not laid out')
    assertCenteredColumn(navBox, LANDSCAPE_PHONE.width)

    // The primary guided flow still works at this short, wide viewport,
    // and its ThumbBar stays reachable (not pushed off by a clipped
    // column) — "the player stays usable (scrollable)".
    await page.getByRole('link', { name: 'Start workout' }).click()
    await page.getByRole('button', { name: 'Start workout' }).click()
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await expect(page.locator('[data-armed="true"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
  })
})
