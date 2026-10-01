import { expect, test, type Page } from '@playwright/test'
import { finishWorkout } from './helpers'

// The celebration sound palette (src/application/celebrationSounds.ts) is
// WebAudio-only: there's nothing to see, so these count AudioContext
// oscillator starts (one per note) through a real AudioContext stand-in,
// gated by the Sound setting.

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

test('Sound on: the start screen plays its whoosh once when Start is tapped', async ({ page }) => {
  await countOscillatorStarts(page)
  await setSound(page, true)
  await page.goto('/#/checkin/fs.quick-10')
  expect(await oscStarts(page)).toBe(0)
  await page.getByRole('button', { name: 'Start workout' }).click()
  // buildStartWhoosh is three notes; it should land once, not repeat.
  await expect.poll(() => oscStarts(page)).toBe(3)
  await page.waitForTimeout(500)
  expect(await oscStarts(page)).toBe(3)
})

test('Sound off: no celebration sound plays, on Start or through a finished workout', async ({ page }) => {
  test.setTimeout(120_000)
  await countOscillatorStarts(page)
  await setSound(page, false)
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  expect(await oscStarts(page)).toBe(0)
  await finishWorkout(page)
  await page.waitForTimeout(1_000)
  expect(await oscStarts(page)).toBe(0)
})

test('Sound on: Complete-screen celebrations play and settle without repeating', async ({ page }) => {
  test.setTimeout(120_000)
  await countOscillatorStarts(page)
  await setSound(page, true)
  // This scripted first workout of the week levels up and earns badges
  // (see e2e/xp.spec.ts and e2e/achievements.spec.ts), each firing a sound.
  await page.clock.install({ time: new Date(2026, 8, 30, 12, 0, 0) })
  await page.goto('/#/checkin/fs.full-body-a')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)
  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect.poll(() => oscStarts(page)).toBeGreaterThan(0)
  // Let every one-shot celebration land, including the bloom chip's own
  // 1.45s reveal delay, before taking the "settled" snapshot.
  await page.waitForTimeout(2_000)
  const settled = await oscStarts(page)
  await page.waitForTimeout(2_000)
  // Celebrations are one-shot: waiting out the level-up overlay's own
  // fade must not trigger a second round of sound.
  expect(await oscStarts(page)).toBe(settled)
})
