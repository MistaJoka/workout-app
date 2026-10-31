import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

// The player shows a move's short cue under Rae and folds the full steps
// behind "Show steps" (closed on every set, nothing remembered). A move done
// in 3+ finished sessions (FAMILIAR_AFTER_SESSIONS) drops the cue too.
// Familiarity is seeded through the real Settings import, the same path a
// restored backup takes.

const SQUAT_CUE = 'Stand with your feet shoulder width apart.'
const SQUAT_STEP = /Begin the movement by flexing your knees and hips/
const PUSH_UP_CUE = 'Stand facing bench or sturdy elevated platform.'

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

test('a new move shows its short cue; the steps open on a tap and close again', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await startFullBodyA(page)
  await expect(page.getByTestId('player-cues')).toHaveText(SQUAT_CUE)
  await expect(page.getByText(SQUAT_STEP)).toBeHidden()
  const showSteps = page.getByRole('button', { name: 'Show steps' })
  await expect(showSteps).toHaveAttribute('aria-expanded', 'false')
  await showSteps.click()
  await expect(page.getByText(SQUAT_STEP)).toBeVisible()
  await page.getByRole('button', { name: 'Hide steps' }).click()
  await expect(page.getByText(SQUAT_STEP)).toBeHidden()

  // Opened again, then the next set: closed, nothing remembered.
  await page.getByRole('button', { name: 'Show steps' }).click()
  await finishSet(page)
  await expect(page.getByText(/Set 2 of 2/)).toBeVisible()
  await expect(page.getByText(SQUAT_STEP)).toBeHidden()
  await expect(page.getByRole('button', { name: 'Show steps' })).toBeVisible()
})

test('a familiar move shows no cue, its steps one tap away', async ({ page }) => {
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
  await expect(page.getByTestId('player-cues')).toHaveCount(0)
  await expect(page.getByText(SQUAT_STEP)).toBeHidden()
  await showSteps.click()
  await expect(page.getByText(SQUAT_STEP)).toBeVisible()

  // Done only twice: its cue still shows.
  await finishSet(page)
  await finishSet(page)
  await expect(page.getByRole('heading', { name: 'Incline Push-Up' })).toBeVisible()
  await expect(page.getByTestId('player-cues')).toHaveText(PUSH_UP_CUE)
})
