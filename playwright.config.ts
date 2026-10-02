import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against a production build served by `vite preview`,
// on a phone-sized viewport, with a fresh browser context (fresh IndexedDB,
// no service worker) per test. E2E_PORT lets parallel worktrees run at once.
const port = Number(process.env.E2E_PORT ?? 4199)
const baseURL = `http://localhost:${port}`

// Opt-in GitHub Pages project-site check: `npm run e2e:base` sets
// E2E_BASE_PATH (e.g. '/workout-app/') so the build, the preview server and
// the single base-path project all point at that sub-path, instead of the
// default build rooted at '/'. Leaving E2E_BASE_PATH unset (the normal
// `npm run e2e` / `e2e:webkit`) reproduces the previous behavior exactly —
// base-path.spec.ts is excluded from both default projects so it never
// runs, unparameterized, against the '/' build where it would just fail.
const basePath = process.env.E2E_BASE_PATH
const resolvedBaseURL = basePath ? `${baseURL}${basePath}` : baseURL

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: resolvedBaseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  // Chromium phone runs locally (`npm run e2e`). WebKit is the iPhone
  // engine; CLAUDE.md requires it for an iPhone-first app, but its Linux
  // build needs Ubuntu libraries, so `npm run e2e:webkit` runs it inside
  // Playwright's official Ubuntu image (scripts/e2e-webkit.sh).
  projects: basePath
    ? [{ name: 'base-path', testMatch: /base-path\.spec\.ts/ }]
    : [
        { name: 'chromium', testIgnore: /base-path\.spec\.ts/ },
        {
          name: 'webkit-iphone',
          use: { ...devices['iPhone 13'], baseURL, trace: 'retain-on-failure' },
          testIgnore: /base-path\.spec\.ts/,
        },
      ],
  webServer: {
    command: basePath
      ? `VITE_BASE_PATH=${basePath} npm run build && VITE_BASE_PATH=${basePath} npm run preview -- --port ${port} --strictPort`
      : `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: resolvedBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
