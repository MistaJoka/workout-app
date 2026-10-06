import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'
import { encodeGiftPayload } from '../src/domain/rewards/giftLink'

// Gift links end to end (domain/rewards/giftLink.ts): Hubby Bunny composes
// a gift on his own phone/profile (a completely separate browser context,
// standing in for his separate iPhone) and sends a link; she opens it on
// hers, previews it without ever seeing the sealed notes' text, and
// accepting adds the reward and locks in the note. Re-opening the same
// link afterwards is a no-op ("Already added"). The second half proves the
// delivery round trip: her redeemed coupon's share message carries a short
// code, he turns that into a `kind: 'delivered'` link, and opening it on
// her phone marks the coupon delivered -- without his device ever touching
// her data directly.
//
// "Copying" a link here means reading the URL text the composer displays
// (data-testid="gift-link-url"/"delivered-link-url") rather than driving
// the actual Share button, so the test doesn't depend on clipboard
// permissions; the coupon's own share message (which does go through
// navigator.share) is stubbed the same way rewards.spec.ts stubs it.

async function enterPin(page: Page, pin: string, label: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(pin)
}

async function stubShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as { __shares: unknown[] }).__shares = []
    Object.defineProperty(Navigator.prototype, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(Navigator.prototype, 'share', {
      value: async (data: { files?: File[]; title?: string; text?: string }) => {
        const file = data.files?.[0]
        ;(window as unknown as { __shares: unknown[] }).__shares.push({ name: file?.name, title: data.title, text: data.text })
      },
      configurable: true,
    })
  })
}

async function waitForShares(page: Page, countAtLeast: number): Promise<{ name?: string; title?: string; text?: string }[]> {
  await page.waitForFunction((n) => (window as unknown as { __shares: unknown[] }).__shares.length >= n, countAtLeast)
  return page.evaluate(() => (window as unknown as { __shares: { name?: string; title?: string; text?: string }[] }).__shares)
}

async function linkText(page: Page, testId: string): Promise<string> {
  const text = await page.getByTestId(testId).textContent()
  if (!text) throw new Error(`No link text at ${testId}`)
  return text.trim()
}

test('gift links: compose on one phone, accept on another, then round-trip a delivery', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000)

  // Her phone: a separate browser context, so this is a genuinely separate
  // profile/device (own IndexedDB), the same way her Android app and his
  // iPhone PWA never share storage.
  const herContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const her = await herContext.newPage()
  await stubShareSheet(her)

  // --- His phone: set up the shop PIN (first use) and compose a gift. ---
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Send a gift 💌', exact: true }).click()
  await expect(page.getByText('Set a PIN')).toBeVisible()
  await enterPin(page, '4821', 'New PIN')
  await enterPin(page, '4821', 'Confirm PIN')
  await page.getByRole('button', { name: 'Save PIN' }).click()

  await expect(page.getByText('Pick rewards and notes to send as a link')).toBeVisible()
  await page.getByRole('button', { name: '+ New reward' }).click()
  await page.getByLabel('New reward title').fill('Foot rub')
  // The same pixel pictures as the shop editor, not a bare emoji row.
  await page.getByRole('group', { name: 'Reward icons' }).getByRole('button', { name: 'Foot rub', exact: true }).click()
  // The icon fills in its price (30); one Quick 10 later must afford it.
  await page.getByRole('button', { name: 'Fewer carrots' }).click()
  await page.getByRole('button', { name: 'Fewer carrots' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: '+ New note' }).click()
  await page.getByLabel('New note text').fill('Proud of you, superstar')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: /Make gift link/ }).click()
  const giftUrl = await linkText(page, 'gift-link-url')
  expect(giftUrl).toMatch(/#\/gift\?d=/)
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  // --- Her phone: preview never reveals the note's text, then Accept. ---
  await her.goto(giftUrl)
  await expect(her.getByTestId('gift-from')).toHaveText('Hubby Bunny')
  await expect(her.getByTestId('gift-rewards')).toContainText('Foot rub')
  await expect(her.getByTestId('gift-rewards').locator('img[src*="foot-rub"]')).toHaveCount(1)
  // A plain browser tab (not the installed app) says its data is separate,
  // without blocking Accept for browser-only use.
  await expect(her.getByTestId('open-in-app')).toContainText('keeps its own data')
  await expect(her.getByTestId('gift-sealed-notes')).toContainText('1 sealed love note')
  await expect(her.getByText('Proud of you, superstar')).toHaveCount(0)
  await her.getByRole('button', { name: 'Accept' }).click()
  await expect(her).toHaveURL(/#\/rewards$/)
  await expect(her.getByText('Foot rub')).toBeVisible()

  // Her love notes box got the locked note too (still sealed).
  await her.goto('/#/notes')
  await expect(her.getByTestId('love-notes-sealed')).toContainText('1 sealed note waiting')

  // Re-opening the exact same link a second time is a no-op.
  await her.goto(giftUrl)
  await expect(her.getByTestId('gift-already')).toBeVisible()
  await her.getByRole('button', { name: 'Close', exact: true }).click()
  await her.goto('/#/rewards')
  await expect(her.getByText('Foot rub')).toHaveCount(1)

  // --- Delivery round trip: she earns carrots, redeems, and shares the
  // coupon; its message carries a short code (no image-only coupon this
  // time). ---
  await her.goto('/#/checkin/fs.quick-10')
  await her.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(her)
  await her.goto('/#/rewards')
  await her.getByRole('button', { name: 'Redeem' }).click()
  await her.getByRole('button', { name: /^Redeem for/ }).click()
  await her.getByRole('button', { name: /^Send to/ }).click()
  const shares = await waitForShares(her, 1)
  const couponMessage = shares[0].text ?? ''
  expect(couponMessage).toMatch(/FS-[0-9A-F]{6}/)
  expect(couponMessage).toContain('Foot rub')

  // --- His phone: paste her message, build a "delivered" link, send it
  // back (no access to her data -- just the code she sent). A fresh load
  // (about:blank bounce) starts Hubby mode locked, so this asks for the PIN.
  await page.goto('about:blank')
  await page.goto('/#/rewards')
  await page.getByRole('button', { name: 'Mark delivered', exact: true }).click()
  await expect(page.getByText('Enter PIN')).toBeVisible()
  await enterPin(page, '4821', 'PIN')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByLabel('Coupon code or message').fill(couponMessage)
  await page.getByRole('button', { name: 'Make delivered link' }).click()
  const deliveredUrl = await linkText(page, 'delivered-link-url')
  expect(deliveredUrl).toMatch(/#\/gift\?d=/)

  // --- Her phone: opening it marks the coupon delivered. ---
  await her.goto(deliveredUrl)
  await expect(her.getByTestId('delivered-titles')).toContainText('Foot rub')
  await her.getByRole('button', { name: 'Accept' }).click()
  await expect(her).toHaveURL(/#\/rewards$/)
  await expect(her.getByText('Delivered').first()).toBeVisible()

  // Re-opening the delivered link again says it's already applied.
  await her.goto(deliveredUrl)
  await expect(her.getByTestId('delivered-already')).toBeVisible()

  await herContext.close()
})

test('an invalid gift link shows a friendly error', async ({ page }) => {
  await page.goto('/#/gift?d=not-a-real-payload')
  await expect(page.getByTestId('gift-invalid')).toBeVisible()

  await page.goto('/#/gift')
  await expect(page.getByTestId('gift-invalid')).toBeVisible()
})

// Her app can be the installed APK while his link is a web address, so the
// shop accepts a pasted link (or his whole shared message).
test('pasting a gift message into the shop opens the gift', async ({ page }) => {
  const encoded = encodeGiftPayload({
    v: 1,
    kind: 'gift',
    from: 'Hubby Bunny',
    rewards: [{ id: 'paste-1', title: 'Movie night', cost: 25, emoji: '🎬' }],
    notes: [],
    createdAt: '2026-10-02T12:00:00.000Z',
  })
  await page.goto('/#/rewards')
  await page.getByText('Got a link? Paste it here').click()
  await page.getByLabel('Gift link').fill('nonsense')
  await page.getByRole('button', { name: 'Open link' }).click()
  await expect(page.getByRole('alert')).toHaveText("That doesn't look like a gift link.")

  await page.getByLabel('Gift link').fill(`Hubby Bunny sent you 1 reward 💌\nhttps://example.test/#/gift?d=${encoded}`)
  await page.getByRole('button', { name: 'Open link' }).click()
  await expect(page).toHaveURL(/#\/gift\?d=/)
  await expect(page.getByTestId('gift-rewards')).toContainText('Movie night')
  await expect(page.getByTestId('gift-target-profile')).toHaveText('Adding to your shop.')
})

