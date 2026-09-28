import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against a production build served by `vite preview`,
// on a phone-sized viewport, with a fresh browser context (fresh IndexedDB,
// no service worker) per test. E2E_PORT lets parallel worktrees run at once.
const port = Number(process.env.E2E_PORT ?? 4199)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  // Chromium phone runs locally (`npm run e2e`). WebKit is the iPhone
  // engine; CLAUDE.md requires it for an iPhone-first app, but its Linux
  // build needs Ubuntu libraries, so `npm run e2e:webkit` runs it inside
  // Playwright's official Ubuntu image (scripts/e2e-webkit.sh).
  projects: [
    { name: 'chromium' },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 13'], baseURL, trace: 'retain-on-failure' },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
