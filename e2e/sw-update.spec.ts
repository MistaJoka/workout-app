import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// A deploy while the app is open: the new worker installs and WAITS, so a
// workout in progress keeps running on its build (whose lazy chunks are
// still cached, even offline). "Update ready" appears; Reload hands over
// and lands on the new build. The deploy is simulated by rewriting the
// served dist/sw.js with a different BUILD_ID of the same length (the
// preview server fixes Content-Length at startup), restored afterwards.

test.skip(({ browserName }) => browserName !== 'chromium', 'Playwright WebKit cannot drive service-worker updates')

// Playwright runs from the repo root.
const SW = path.resolve('dist/sw.js')

async function controllerScript(page: Page): Promise<string | null> {
  return page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null)
}

test('an update waits for Reload; the running build keeps working offline meanwhile', async ({ page, context }) => {
  const original = await readFile(SW, 'utf8')
  try {
    await run(page, context, original)
  } finally {
    await writeFile(SW, original)
  }
})

async function run(page: Page, context: BrowserContext, original: string): Promise<void> {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => controllerScript(page)).not.toBeNull()

  // Start a workout on build 1.
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()

  // "Deploy" build 2: same bytes except the build id.
  const id = original.match(/const BUILD_ID = '([^']+)'/)?.[1]
  if (!id) throw new Error('BUILD_ID not stamped in dist/sw.js')
  const next = id.slice(0, -1) + (id.endsWith('x') ? 'y' : 'x')
  await writeFile(SW, original.replace(`const BUILD_ID = '${id}'`, `const BUILD_ID = '${next}'`))
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  })
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting != null)).toBe(true)

  // The new build waits: the toast shows, the workout is untouched, and the
  // lazy library chunk of the running build still loads with the network off.
  await expect(page.getByText('Update ready')).toBeVisible()
  await expect(page.getByText(/Set 1 of/)).toBeVisible()
  await context.setOffline(true)
  await page.goto('/#/library')
  await expect(page.getByText(/\d+ exercises/).first()).toBeVisible()
  await context.setOffline(false)

  // Reload hands over to the new worker and reloads onto it.
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Reload' }).click()])
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting == null))
    .toBe(true)
  await expect(page.getByText('Update ready')).toBeHidden()
}
