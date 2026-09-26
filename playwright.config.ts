import { defineConfig } from '@playwright/test'

// End-to-end tests run against a production build served by `vite preview`,
// on a phone-sized viewport, with a fresh browser context (fresh IndexedDB,
// no service worker) per test.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4199',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4199 --strictPort',
    url: 'http://localhost:4199',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
