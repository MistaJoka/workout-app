import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

// CLAUDE.md: "An Offline banner is not proof of offline function; test an
// actually network-disabled reload/execution path." This installs the app
// the way a phone does (first visit registers the service worker, a second
// visit runs under it and fills the runtime cache), then cuts the network
// entirely, reloads, and does a full curated workout with nothing but the
// cache. Every image the workout shows must actually load.
test('a curated workout runs start to finish with the network off', async ({ page, context, browserName }) => {
  // Playwright's Linux WebKit can't drive a service-worker reload
  // ("WebKit encountered an internal error" on the first reload). That's a
  // tooling limit, not an app result: real-iPhone offline stays a manual
  // check (docs/IOS_PWA_RUNTIME.md).
  test.skip(browserName === 'webkit', "Playwright WebKit can't drive service-worker reloads")
  test.setTimeout(180_000)
  await page.goto('/')
  await dismissWelcome(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Second visit, now controlled by the worker: hashed chunks get cached.
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true)
  await page.reload()
  await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()

  await context.setOffline(true)
  await page.reload()

  // Today, the start screen and the player all render from the cache.
  await expect(page.getByRole('link', { name: 'Start workout' })).toBeVisible()
  await page.getByRole('link', { name: 'Start workout' }).click()
  await expect(page.getByRole('list', { name: 'Your workout' })).toBeVisible()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()

  // Every image on the player screen actually decoded (none broken).
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src)
      )
    )
    .toEqual([])
  expect(await page.evaluate(() => document.images.length)).toBeGreaterThan(0)

  await finishWorkout(page)
  await expect(page.getByText(/sets completed/)).toBeVisible()

  // The finished workout was saved locally and shows on Today, still offline.
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page.getByText('Done for today')).toBeVisible()
  await context.setOffline(false)
})
