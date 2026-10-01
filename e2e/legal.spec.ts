import { expect, test } from '@playwright/test'

// In-app legal/trust pages (store-listing requirement): Privacy, Terms and
// Open-source licenses, reachable from Settings "More" and from About, each
// with a working BackButton and a "Last updated" date.

test('Settings → More links to Privacy, Terms and Open-source licenses', async ({ page }) => {
  await page.goto('/#/settings')
  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await expect(page.getByText(/Last updated/)).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('link', { name: 'Terms' }).click()
  await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeVisible()
  await expect(page.getByText(/Last updated/)).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('link', { name: 'Open-source licenses' }).click()
  await expect(page.getByRole('heading', { name: 'Open-source licenses' })).toBeVisible()
  await expect(page.getByText(/Last updated/)).toBeVisible()
})

test('About links to Privacy, Terms and Open-source licenses', async ({ page }) => {
  await page.goto('/#/about')
  await page.getByRole('link', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()

  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
  await page.getByRole('link', { name: 'Terms of use' }).click()
  await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()

  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
  await page.getByRole('link', { name: 'Open-source licenses' }).click()
  await expect(page.getByRole('heading', { name: 'Open-source licenses' })).toBeVisible()
})

test('Privacy policy mentions on-device storage and the GitHub photo fetch', async ({ page }) => {
  await page.goto('/#/privacy')
  await expect(page.getByText(/IndexedDB/)).toBeVisible()
  await expect(page.getByText(/raw\.githubusercontent\.com/)).toBeVisible()
  await expect(page.getByText(/Danger zone/)).toBeVisible()
})

test('Terms of use repeats the health disclaimer', async ({ page }) => {
  await page.goto('/#/terms')
  await expect(page.getByText(/not a substitute for guidance from a qualified professional/i)).toBeVisible()
  await expect(page.getByText(/"as is"/)).toBeVisible()
})

test('Open-source licenses lists packages collapsibly with license text inside', async ({ page }) => {
  await page.goto('/#/licenses')
  await expect(page.getByText('react', { exact: true })).toBeVisible()
  await expect(page.getByText('dexie', { exact: true })).toBeVisible()

  // Collapsed by default: the license text isn't in the accessibility tree
  // until its <details> is opened.
  const reactDetails = page.locator('details', { hasText: 'react' }).first()
  await expect(reactDetails.locator('pre')).toBeHidden()
  await reactDetails.locator('summary').click()
  await expect(reactDetails.locator('pre')).toBeVisible()
  await expect(reactDetails.locator('pre')).toContainText(/MIT License/i)

  // Content credits for non-npm material.
  await expect(page.getByText('free-exercise-db', { exact: true })).toBeVisible()
  await expect(page.getByText('FitnessTrack', { exact: true })).toBeVisible()
})
