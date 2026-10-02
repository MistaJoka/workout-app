import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// Hubby Bunny's reward shop end to end: a finished workout earns carrots
// (shown on Complete and on Today), setting up the shop from Settings,
// adding a starter-suggested reward, redeeming it, sharing the coupon, and
// marking it delivered behind the PIN.

async function stubShareSheet(page: Page): Promise<void> {
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
        ;(window as unknown as { __shares: unknown[] }).__shares.push({ name: file?.name, type: file?.type, width, height })
      },
      configurable: true,
    })
  })
}

async function waitForShare(page: Page, countAtLeast: number) {
  await page.waitForFunction((n) => (window as unknown as { __shares: unknown[] }).__shares.length >= n, countAtLeast)
  return page.evaluate(() => (window as unknown as { __shares: { name?: string; type?: string; width?: number; height?: number }[] }).__shares)
}

// input[type=password] has no accessible "textbox" role, so it's found by
// its accessible label instead of getByRole.
async function enterPin(page: Page, pin: string, label: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(pin)
}

test('earning, redeeming and delivering a Hubby Bunny reward', async ({ page }) => {
  test.setTimeout(150_000)
  await stubShareSheet(page)

  // Finishing Quick 10 (6 sets, all met, nothing skipped) earns the flat
  // workout bonus + one per set + the perfect bonus: 10 + 6 + 5 = 21. The
  // default weekly goal (2) isn't met by a single session, so no bonus yet.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByTestId('carrot-gain').getByLabel('Plus 21 carrots')).toBeVisible()

  // Today shows the same balance, as a chip linking to the shop.
  await page.goto('/#/')
  await expect(page.getByTestId('carrot-balance-chip')).toContainText('21')

  // Settings -> "Hubby's reward shop" opens straight into first-time setup.
  await page.goto('/#/settings')
  await page.getByRole('link', { name: "Hubby's reward shop" }).click()
  await expect(page.getByText('Set a PIN')).toBeVisible()
  await enterPin(page, '4821', 'New PIN')
  await enterPin(page, '4821', 'Confirm PIN')
  await page.getByRole('button', { name: 'Save PIN' }).click()

  // The editor opens right away (he just set the PIN himself); the shop is
  // empty, so starter suggestions are offered, never pre-created.
  await expect(page.getByText("Hubby Bunny's shop")).toBeVisible()
  await expect(page.getByRole('button', { name: /No-dishes pass/ })).toBeVisible()
  await page.getByRole('button', { name: /No-dishes pass/ }).click()
  await expect(page.getByText('No-dishes pass').first()).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // Back on the shop: the reward is redeemable (21 >= 15).
  await expect(page.getByTestId('rewards-balance')).toContainText('21')
  await expect(page.getByText('No-dishes pass')).toBeVisible()
  await page.getByRole('button', { name: 'Redeem' }).click()
  await page.getByRole('button', { name: /Redeem for 15/ }).click()

  // The coupon appears; sharing it hands over a 1080x1350 PNG named for the day.
  await expect(page.getByTestId('coupon-card')).toContainText('No-dishes pass')
  await page.getByRole('button', { name: /^Send to/ }).click()
  const shares = await waitForShare(page, 1)
  expect(shares[0]).toMatchObject({ type: 'image/png', width: 1080, height: 1350 })
  expect(shares[0].name).toMatch(/^coupon-\d{4}-\d{2}-\d{2}\.png$/)

  // Marking it delivered is PIN-gated again; a wrong PIN is rejected.
  await page.getByRole('button', { name: 'Hubby: mark delivered' }).click()
  await enterPin(page, '0000', 'PIN')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByText('Wrong PIN.')).toBeVisible()
  await enterPin(page, '4821', 'PIN')
  await page.getByRole('button', { name: 'Unlock' }).click()

  // Back on the shop screen: balance spent, and the coupon shows delivered.
  await expect(page.getByTestId('rewards-balance')).toContainText('6')
  await expect(page.getByText('Delivered').first()).toBeVisible()

  // Progress's collection grid links to the same shop.
  await page.goto('/#/progress')
  await expect(page.getByRole('link', { name: /Hubby's shop: 6 carrots/ })).toBeVisible()
})
