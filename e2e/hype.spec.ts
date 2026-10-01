import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// The hype countdown (HypeCountdown.tsx) only ever shows after a real
// "Start workout" tap, and never under WebDriver unless explicitly forced
// (so the rest of the e2e suite — which starts workouts and immediately
// taps Complete Set via helpers.finishWorkout — never sees it and never
// needs to change). These specs force it on with the `hype` localStorage
// flag and drive the overlay directly.

async function forceHypeOn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('hype', '1')
    } catch {
      // ignore
    }
  })
}

async function countOscillatorStarts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __oscStarts: number }
    w.__oscStarts = 0
    class FakeParam {
      value = 0
      setValueAtTime() {
        return this
      }
      exponentialRampToValueAtTime() {
        return this
      }
      linearRampToValueAtTime() {
        return this
      }
    }
    class FakeNode {
      connect() {
        return this
      }
      disconnect() {}
    }
    class FakeOscillator extends FakeNode {
      type = 'sine'
      frequency = new FakeParam()
      start() {
        w.__oscStarts++
      }
      stop() {}
    }
    class FakeGain extends FakeNode {
      gain = new FakeParam()
    }
    class FakeAudioContext {
      state = 'running'
      currentTime = 0
      destination = new FakeNode()
      createOscillator() {
        return new FakeOscillator()
      }
      createGain() {
        return new FakeGain()
      }
      resume() {
        this.state = 'running'
        return Promise.resolve()
      }
    }
    // @ts-expect-error test stand-in, not a real AudioContext
    window.AudioContext = FakeAudioContext
    // @ts-expect-error same, for Safari's prefixed name
    window.webkitAudioContext = FakeAudioContext
  })
}
const oscStarts = (page: Page) => page.evaluate(() => (window as unknown as { __oscStarts: number }).__oscStarts)

async function setSound(page: Page, on: boolean): Promise<void> {
  await page.goto('/#/settings')
  const toggle = page.getByRole('button', { name: /^Sound (on|off)$/ })
  const label = await toggle.textContent()
  if ((label === 'Sound on') !== on) await toggle.click()
  await expect(toggle).toHaveText(on ? 'Sound on' : 'Sound off')
}

test('without forcing it on, automation never sees the hype overlay', async ({ page }) => {
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
  await expect(page.locator('[data-testid="hype-countdown"]')).toHaveCount(0)
})

test('forced on: counts down over Rae, names the first move, then gets out of the way on its own', async ({ page }) => {
  await forceHypeOn(page)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()

  const overlay = page.locator('[data-testid="hype-countdown"]')
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText(/Up first: /)
  // The player underneath is already fully mounted and working the whole
  // time (starting a workout must stay fast): its Complete Set button
  // exists even while the overlay sits on top of it.
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
  // 3-2-1 then "Let's go!": the overlay disappears on its own well under 3s.
  await expect(overlay).toBeHidden({ timeout: 3_500 })

  // The workout finishes normally once the overlay is gone.
  await finishWorkout(page)
})

test('forced on: a tap anywhere skips it immediately', async ({ page }) => {
  await forceHypeOn(page)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()

  const overlay = page.locator('[data-testid="hype-countdown"]')
  await expect(overlay).toBeVisible()
  await overlay.click()
  await expect(overlay).toBeHidden({ timeout: 500 })
  await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible()
})

test('Sound on: the countdown ticks three times before "Let\'s go!"', async ({ page }) => {
  await countOscillatorStarts(page)
  await forceHypeOn(page)
  await setSound(page, true)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  // The start whoosh (3 notes) plus the countdown's three ticks.
  await expect.poll(() => oscStarts(page)).toBeGreaterThanOrEqual(6)
  await expect(page.locator('[data-testid="hype-countdown"]')).toBeHidden({ timeout: 3_500 })
})

test('Sound off: no ticks play during the countdown', async ({ page }) => {
  await countOscillatorStarts(page)
  await forceHypeOn(page)
  await setSound(page, false)
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.locator('[data-testid="hype-countdown"]')).toBeVisible()
  await expect(page.locator('[data-testid="hype-countdown"]')).toBeHidden({ timeout: 3_500 })
  expect(await oscStarts(page)).toBe(0)
})

test('with Animations off, the overlay shows "Let\'s go!" and the first move only, briefly', async ({ page }) => {
  await forceHypeOn(page)
  await page.goto('/#/about')
  await page.getByRole('button', { name: 'Off', exact: true }).click()
  await page.goto('/#/checkin/fs.quick-10')
  await page.getByRole('button', { name: 'Start workout' }).click()

  const overlay = page.locator('[data-testid="hype-countdown"]')
  await expect(overlay).toContainText("Let's go!")
  await expect(overlay).toContainText(/Up first: /)
  await expect(overlay).toHaveCount(0, { timeout: 1_200 })
  await finishWorkout(page)
})
