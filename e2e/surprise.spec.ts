import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

test('Surprise me spins, then lands on a Start screen', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: /^Surprise me/ }).click()
  await expect(page.locator('.surprise-reel')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible({ timeout: 8_000 })
})

test('a tap during the spin jumps to the pick', async ({ page }) => {
  await page.goto('/#/surprise')
  await dismissWelcome(page)
  await expect(page.locator('.surprise-reel')).toBeVisible()
  await page.locator('.surprise-stage').click()
  await expect(page.getByTestId('surprise-result')).toBeVisible()
  await expect(page.locator('.surprise-reel')).toHaveCount(0)
})

test('reduced motion shows the pick with no reel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/surprise')
  await dismissWelcome(page)
  await expect(page.getByTestId('surprise-result')).toBeVisible()
  await expect(page.locator('.surprise-reel')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible({ timeout: 8_000 })
})
