import { expect, test } from '@playwright/test'

test.describe('routine detail', () => {
  test('a curated routine shows its size, length and an add-to-week link, read-only', async ({ page }) => {
    await page.goto('/#/routines/fs.full-body-a')
    await expect(page.getByRole('heading', { name: 'Full-Body A' })).toBeVisible()
    await expect(page.getByText(/^5 moves, 10 sets, about \d+ min$/)).toBeVisible()
    await expect(page.getByRole('link', { name: '+ Add to my week' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()
  })

  test('a draft routine carries its Draft tag', async ({ page }) => {
    await page.goto('/#/routines/draft.warm-up')
    await expect(page.getByRole('heading', { name: /Warm-up/ })).toContainText('Draft')
  })

  test('a planned routine says which days it is on', async ({ page }) => {
    await page.goto('/#/schedule')
    await page.getByRole('button', { name: /^Monday/ }).click()
    await page.getByRole('radio', { name: 'Full-Body A' }).click()
    await expect(page.getByRole('button', { name: /^Monday/ })).toContainText('Full-Body A')
    await page.goto('/#/routines/fs.full-body-a')
    await expect(page.getByRole('link', { name: 'On your plan: Mon' })).toBeVisible()
  })

  test('the picker browses by body area and adds several moves in one trip', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Two at once')
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    const area = page.getByRole('group', { name: 'Body area' })
    await expect(area.getByRole('button', { name: 'Legs' })).toHaveAttribute('aria-pressed', 'true')
    const add = page.getByRole('button', { name: /^Add/ })
    await expect(add).toBeDisabled()

    const squat = page.getByRole('button', { name: /Mini Squat/ }).first()
    await squat.click()
    await expect(squat).toHaveAttribute('aria-pressed', 'true')
    await area.getByRole('button', { name: 'Core' }).click()
    await expect(area.getByRole('button', { name: 'Core' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /Mini Squat/ })).toHaveCount(0)
    await page.locator('ul.grid button[aria-pressed="false"]').first().click()
    // A tap on a picked move takes it back.
    const second = page.locator('ul.grid button[aria-pressed="true"]')
    await expect(second).toHaveCount(1)
    await page.getByRole('button', { name: 'Add 2', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(2)
  })

  test('a custom routine can be edited, and deleting asks first', async ({ page }) => {
    await page.goto('/#/routines/new')
    await page.getByPlaceholder('Routine name').fill('Evening')
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByRole('button', { name: /Mini Squat/ }).first().click()
    await page.getByRole('button', { name: 'Add 1', exact: true }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByRole('heading', { name: 'Evening' })).toBeVisible()
    await expect(page.getByText(/^1 move, 3 sets, about \d+ min$/)).toBeVisible()

    const edit = page.getByRole('link', { name: 'Edit' })
    const del = page.getByRole('button', { name: 'Delete' })
    for (const control of [edit, del]) {
      const box = await control.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }

    await del.click()
    const sheet = page.getByRole('dialog', { name: 'Delete Evening?' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Keep it' }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Evening' })).toBeVisible()

    await del.click()
    await page.getByRole('dialog', { name: 'Delete Evening?' }).getByRole('button', { name: 'Yes, delete' }).click()
    await expect(page.getByPlaceholder('Search exercises')).toBeVisible()
    await expect(page.getByText('Evening')).toHaveCount(0)
  })
})
