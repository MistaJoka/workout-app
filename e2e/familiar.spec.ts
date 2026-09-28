import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

// A move done in 3+ finished sessions (FAMILIAR_AFTER_SESSIONS) folds its
// steps behind "Show steps"; a new move shows them. Familiarity is seeded
// through the real Settings import, the same path a restored backup takes.

const SQUAT_STEP = /Stand with your feet shoulder width apart/
const PUSH_UP_STEP = /Stand facing bench or sturdy elevated platform/

async function startFullBodyA(page: Page): Promise<void> {
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
}

// Taps a thumb-bar button once the bar is armed (see ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true })
  await expect(button).toBeVisible()
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await button.click()
}

async function finishSet(page: Page): Promise<void> {
  await tapArmed(page, 'Complete Set')
  await tapArmed(page, 'Yes')
  await tapArmed(page, 'Skip rest')
}

test('a new move shows its steps', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await startFullBodyA(page)
  await expect(page.getByText(SQUAT_STEP)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show steps' })).toBeHidden()
})

test('a familiar move folds its steps; opening them keeps them open for the session', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)

  const bundle = {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings: [],
    checkIns: [],
    sessionPlans: [],
    sessionEvents: [],
    sessionResults: [],
    familiarity: [
      { exerciseId: 'fs.bodyweight-squat', exposureCount: 3, lastSeenAt: '2026-09-27T10:00:00.000Z' },
      { exerciseId: 'fs.incline-push-up', exposureCount: 2, lastSeenAt: '2026-09-27T10:00:00.000Z' },
    ],
    progression: [],
  }
  await page.goto('/#/settings')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bundle)),
  })
  const sheet = page.getByRole('dialog', { name: 'Import backup' })
  await sheet.getByRole('button', { name: /^Add to / }).click()
  await expect(sheet).toBeHidden()

  await startFullBodyA(page)
  // Done three times: the screen is Rae and the reps, steps one tap away.
  const showSteps = page.getByRole('button', { name: 'Show steps' })
  await expect(showSteps).toBeVisible()
  await expect(page.getByText(SQUAT_STEP)).toBeHidden()
  await showSteps.click()
  await expect(page.getByText(SQUAT_STEP)).toBeVisible()

  // Still open on the next set of the same move.
  await finishSet(page)
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
  await expect(page.getByText(SQUAT_STEP)).toBeVisible()

  // Done only twice: still shown in full.
  await finishSet(page)
  await expect(page.getByRole('heading', { name: 'Incline Push-Up' })).toBeVisible()
  await expect(page.getByText(PUSH_UP_STEP)).toBeVisible()
  await expect(showSteps).toBeHidden()
})
