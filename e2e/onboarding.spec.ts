import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

// Playwright sets navigator.webdriver, so OnboardingGate stays out of every
// other spec's way by default (they all start a fresh profile on '/' and
// expect Today straight away). `?onboarding=1` is the one override, for
// this suite.
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Welcome to Foundation Strength' })

test('is invisible by default to an automated driver, even on a brand new profile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
  await expect(dialog(page)).toBeHidden()
})

test('the forced tour walks all four screens, saves the name and unit, then never shows again', async ({ page }) => {
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).locator('.rounded-full')).toHaveCount(4) // progress dots

  // (a) what this is
  await expect(dialog(page).getByRole('heading', { name: 'Short guided workouts, at home, no equipment' })).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Next' }).click()

  // (b) meet Rae
  await expect(dialog(page).getByRole('heading', { name: 'Meet Rae' })).toBeVisible()
  await expect(dialog(page).getByText('She shows every move, step by step.')).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Next' }).click()

  // (c) set up: optional name + weight unit (default is lb for Playwright's en-US locale)
  await expect(dialog(page).getByRole('heading', { name: 'Set up' })).toBeVisible()
  const unitKg = dialog(page).getByRole('button', { name: 'kg', exact: true })
  const unitLb = dialog(page).getByRole('button', { name: 'lb', exact: true })
  await expect(unitLb).toHaveAttribute('aria-pressed', 'true')
  await dialog(page).getByLabel('What should Rae call you? (optional)').fill('Andrae')
  await unitKg.click()
  await expect(unitKg).toHaveAttribute('aria-pressed', 'true')

  // Back and forward keeps what was entered.
  await dialog(page).getByRole('button', { name: 'Back' }).click()
  await expect(dialog(page).getByRole('heading', { name: 'Meet Rae' })).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Next' }).click()
  await expect(dialog(page).getByLabel('What should Rae call you? (optional)')).toHaveValue('Andrae')
  await expect(unitKg).toHaveAttribute('aria-pressed', 'true')
  await dialog(page).getByRole('button', { name: 'Next' }).click()

  // (d) safety, reusing AboutScreen's exact disclaimer wording
  await expect(dialog(page).getByRole('heading', { name: 'Stay safe' })).toBeVisible()
  await expect(
    dialog(page).getByText('Not a substitute for guidance from a qualified professional. Stop any movement that causes pain.')
  ).toBeVisible()
  await dialog(page).getByRole('button', { name: 'I understand' }).click()

  // Finishes straight into Today, greeting by the saved name.
  await expect(dialog(page)).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening), Andrae$/)

  // The weight unit was saved too.
  await page.goto('/#/settings')
  await expect(page.getByRole('button', { name: 'kg', exact: true })).toHaveClass(/chip-active/)

  // Never shows again: not even when forced again, and not on an ordinary
  // automated open either.
  await page.goto('about:blank')
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeHidden()
  await page.goto('about:blank')
  await page.goto('/')
  await expect(dialog(page)).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening), Andrae$/)
})

test('Skip finishes the tour without saving a name, and it never shows again', async ({ page }) => {
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Skip' }).click()
  await expect(dialog(page)).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)$/)

  await page.goto('about:blank')
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeHidden()
})

test('a profile that already dismissed the old Welcome card is grandfathered in, even forced', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // The old Welcome card is gone from Today, but profiles that dismissed it
  // still carry the setting; write it the way that card did.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('workout-app-v06')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({ key: 'welcomeDismissed', value: true })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      })
  )
  await page.goto('about:blank')
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeHidden()
})

test('a profile that already finished a workout is grandfathered in, even forced', async ({ page }) => {
  test.setTimeout(180_000) // a full workout's worth of sets and rests to skip
  // This profile never saw the tour (automated, not forced) -- it just
  // finished a real workout, which is enough to be a current user. The
  // forced flag must not resurrect the tour for them afterwards.
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByText('Workout complete')).toBeVisible()

  await page.goto('about:blank')
  await page.goto('/?onboarding=1')
  await expect(dialog(page)).toBeHidden()
})
