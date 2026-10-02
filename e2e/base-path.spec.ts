import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

// Opt-in: only runs under `npm run e2e:base` — playwright.config.ts's
// E2E_BASE_PATH-gated 'base-path' project, built with
// VITE_BASE_PATH=/workout-app/ and served under that sub-path, matching
// the GitHub Pages project site (.github/workflows/pages.yml sets the same
// env var). It is excluded from the default `npm run e2e` / `e2e:webkit`
// projects and never runs against the default '/' build.
//
// Every goto/navigation below is base-relative on purpose: with
// `use.baseURL` set to 'http://host:port/workout-app/', a leading-slash URL
// like '/' or '/#/x' resolves to the real origin ROOT (WHATWG URL
// resolution), not the sub-path — exactly the bug this spec exists to
// catch, so writing it that way here would silently test nothing.
//
// Covers CLAUDE.md's base-path gotcha: a root-absolute asset/route URL
// (index.html, manifest.json, sw.js's own registration/scope and its
// precache/fallback paths, Rae's images/loops, exercise photos) 404s once
// the app isn't served from the real origin root.
test('the app, Rae and a workout load with no 404s under a non-root base, and offline reload works after one visit', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  const failed: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })

  // First visit: boots the shell and registers the service worker — at the
  // base path, or registerServiceWorker.ts/sw.js regressed.
  await page.goto('./')
  await dismissWelcome(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope)
  expect(scope).toContain('/workout-app/')

  // A curated workout starts, and Rae's loop — a base-relative asset URL
  // built by raeLoops.ts — actually decodes, not just sits in the DOM with
  // a broken src.
  await page.goto('./#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()
  const raeLoop = page.getByAltText('Rae doing a bodyweight squat')
  await expect(raeLoop).toBeVisible()
  expect(await raeLoop.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // Nothing fetched so far — the shell, the manifest, sw.js, Rae's faces
  // and loop, the exercise photo fallback paths — came back as a 404.
  expect(failed, failed.join('\n')).toEqual([])

  // Second visit: now controlled by the worker, the shell/media caches are
  // filled (same install-then-reload shape as e2e/offline.spec.ts). The
  // workout above was started but not finished, so Today shows Resume, not
  // Start — `.today-mission` covers either state without caring which.
  await page.goto('./')
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller != null)).toBe(true)
  await page.reload()
  await expect(page.locator('.today-mission')).toBeVisible()

  // Offline reload after that one visit: the cached shell (precached at
  // the base path) still renders Today with nothing but the cache.
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.today-mission')).toBeVisible()
  await context.setOffline(false)
})
