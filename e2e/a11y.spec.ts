import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { GARDEN_SPECIES, speciesFor } from '../src/domain/progress/garden'
import { dismissWelcome, finishWorkout } from './helpers'

// Automated accessibility sweep: every primary screen and state gets an
// axe-core pass against WCAG 2.1 A/AA rules (Deque's official
// @axe-core/playwright, the same engine behind axe DevTools). Best-practice
// rules (e.g. "region", "page-has-heading-one") are excluded on purpose --
// they aren't WCAG requirements and this suite is about real conformance,
// not style opinions. A failure prints every violation's rule id, impact,
// help text and the CSS selector(s) of the offending node(s).
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function checkA11y(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  if (results.violations.length === 0) return
  const report = results.violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `    ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[0] ?? ''}`).join('\n')
      return `  [${v.impact}] ${v.id}: ${v.help} (${v.helpUrl})\n${nodes}`
    })
    .join('\n')
  expect(results.violations, `a11y violations on ${where}:\n${report}`).toEqual([])
}

// Route/sheet entrances animate opacity in (index.css: route-enter,
// sheet-panel-in), `backwards`-filled so the element sits at the `from`
// keyframe (opacity: 0) until the animation actually starts. A scan that
// lands in that window sees a transiently near-invisible foreground and
// reports a false color-contrast violation -- the same risk any automated
// screenshot/contrast tool runs against animated UI. Turning motion off
// (one of the app's three real, supported motion settings, same device
// every other spec in this suite uses for deterministic timing, e.g.
// e2e/meadow.spec.ts, e2e/garden-lore.spec.ts) collapses every animation to
// effectively 0 duration (index.css: `[data-motion='off'] *`), so axe only
// ever sees each screen at rest. This changes no information the app
// shows -- motion is explicitly never allowed to do that -- only how fast
// it gets there.
async function turnMotionOff(page: Page): Promise<void> {
  await page.goto('/#/about')
  const off = page.getByRole('button', { name: 'Off' })
  await off.click()
  await expect(off).toHaveClass(/chip-active/)
  // The setting write (setSetting) is async; a beat lets it land on disk
  // before a test reloads the document, or the reload could race it (same
  // caution e2e/onboarding.spec.ts takes after dismissWelcome).
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await turnMotionOff(page)
})

// The bottom bar ignores taps for a moment after it changes (ThumbBar).
async function tapArmed(page: Page, name: string): Promise<void> {
  await expect(page.locator('[data-armed="true"]')).toBeVisible()
  await page.getByRole('button', { name, exact: true }).click()
}

async function start(page: Page, templateId: string): Promise<void> {
  await page.goto(`/#/checkin/${templateId}`)
  await page.getByRole('button', { name: 'Start workout' }).click()
}

// A hash-only navigation doesn't reload the document.
async function reload(page: Page, hash: string): Promise<void> {
  await page.goto('about:blank')
  await page.goto(hash)
}

type Seed = { sessionId: string; endedAt: string }

// Writes sessionResults straight into IndexedDB (same technique as
// e2e/meadow.spec.ts, e2e/garden-lore.spec.ts, e2e/story.spec.ts): the
// fastest honest way to reach a "grown history" state without playing real
// workouts for every screen that only needs some finished sessions behind it.
async function seedSessions(page: Page, sessions: Seed[]): Promise<void> {
  await page.evaluate(async (seed) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('workout-app-v06')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessionResults', 'readwrite')
      for (const s of seed) {
        tx.objectStore('sessionResults').put({
          sessionId: s.sessionId,
          planId: 'fs.quick-10',
          status: 'COMPLETED',
          startedAt: s.endedAt,
          endedAt: s.endedAt,
          totalSetsCompleted: 6,
          totalSetsPlanned: 6,
        })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, sessions)
}

function idForSpecies(speciesId: string, salt: string): string {
  for (let i = 0; i < 100_000; i++) {
    const id = `${salt}-${i}`
    if (speciesFor(id).id === speciesId) return id
  }
  throw new Error(`could not find an id for species ${speciesId}`)
}

test.describe('onboarding tour', () => {
  test('every step of the forced four-screen tour', async ({ page }) => {
    await page.goto('/?onboarding=1')
    const dialog = page.getByRole('dialog', { name: 'Welcome to Foundation Strength' })
    await expect(dialog).toBeVisible()
    await checkA11y(page, 'onboarding step 1 (what this is)')

    await dialog.getByRole('button', { name: 'Next' }).click()
    await checkA11y(page, 'onboarding step 2 (meet Rae)')

    await dialog.getByRole('button', { name: 'Next' }).click()
    await checkA11y(page, 'onboarding step 3 (set up: name + unit)')

    await dialog.getByRole('button', { name: 'Next' }).click()
    await checkA11y(page, 'onboarding step 4 (stay safe)')
  })
})

test.describe('profile picker', () => {
  test('two profiles, asked who is working out', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem(
        'workout-app:profiles',
        JSON.stringify({
          profiles: [
            { id: 'default', name: 'Me' },
            { id: 'kay12345', name: 'Kay' },
          ],
          activeId: 'default',
        })
      )
      localStorage.setItem('workout-app:profile-picked', '2000-01-01')
    })
    await page.reload()
    await expect(page.getByRole('dialog', { name: "Who's working out?" })).toBeVisible()
    await checkA11y(page, 'profile picker')
  })
})

test.describe('today', () => {
  test('a fresh profile', async ({ page }) => {
    await page.goto('/')
    await dismissWelcome(page)
    await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
    await checkA11y(page, 'Today (fresh)')
  })
})

test.describe('start (check-in)', () => {
  test('a curated workout with a warm-up on offer', async ({ page }) => {
    await page.goto('/#/checkin/fs.full-body-a')
    await expect(page.getByRole('region', { name: /^Up first: / })).toBeVisible()
    await checkA11y(page, 'Start screen')
  })
})

test.describe('workout player', () => {
  test('active set', async ({ page }) => {
    await start(page, 'fs.full-body-a')
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await checkA11y(page, 'player: active set')
  })

  test('rest', async ({ page }) => {
    await start(page, 'fs.full-body-a')
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'Yes')
    await expect(page.getByText('Rest', { exact: true })).toBeVisible()
    await checkA11y(page, 'player: rest')
  })

  test('a timed hold counting down', async ({ page }) => {
    await page.clock.install()
    await start(page, 'fs.quick-10')
    await page.getByRole('button', { name: 'Skip this move' }).click()
    await page.getByRole('dialog', { name: /Skip Bodyweight Squat/ }).getByRole('button', { name: 'Skip', exact: true }).click()
    await page.getByRole('button', { name: 'Skip this move' }).click()
    await page.getByRole('dialog', { name: /Skip Incline Push-Up/ }).getByRole('button', { name: 'Skip', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Plank' })).toBeVisible()
    await tapArmed(page, 'Start 20s')
    await expect(page.getByRole('timer')).toHaveText('20')
    await checkA11y(page, 'player: timed hold')
  })

  test('paused', async ({ page }) => {
    await page.clock.install()
    await start(page, 'fs.quick-10')
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'Yes')
    await expect(page.getByRole('timer')).toBeVisible()
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByText('Take your time')).toBeVisible()
    await checkA11y(page, 'player: paused')
  })

  test('the workout overview sheet', async ({ page }) => {
    await start(page, 'fs.full-body-a')
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'Yes')
    await tapArmed(page, 'Skip rest')
    await page.getByRole('button', { name: 'See the whole workout', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Workout overview' })).toBeVisible()
    await checkA11y(page, 'player: workout overview sheet')
  })

  test('the fell-short reps picker', async ({ page }) => {
    await start(page, 'fs.full-body-a')
    await tapArmed(page, 'Complete Set')
    await tapArmed(page, 'No, fell short')
    await expect(page.getByText('How many reps?')).toBeVisible()
    await checkA11y(page, 'player: fell-short quick picks')

    await tapArmed(page, 'Other')
    await expect(page.getByRole('button', { name: 'Fewer reps' })).toBeVisible()
    await checkA11y(page, 'player: fell-short "Other" stepper')
  })
})

test.describe('post-workout screens', () => {
  test('complete, Today after a workout, Progress populated, Badges earned, story chapter unlocked', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/')
    await dismissWelcome(page)
    await page.goto('/#/checkin/fs.full-body-a')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)
    await expect(page.getByText('Workout complete')).toBeVisible()
    await checkA11y(page, 'Complete')

    await page.getByRole('link', { name: 'Back to Today' }).click()
    await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
    await checkA11y(page, 'Today (after a workout)')

    await page.goto('/#/progress')
    await checkA11y(page, 'Progress (populated)')

    await page.goto('/#/achievements')
    await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible()
    await expect(page.getByText(/earned$/)).toBeVisible()
    await checkA11y(page, 'Badges (some earned)')

    await reload(page, '/#/story')
    await expect(page.getByRole('heading', { name: "Rae's story" })).toBeVisible()
    await checkA11y(page, 'story: list (one chapter unlocked)')

    await page.getByRole('link', { name: /^Chapter 1: A Mysterious Seed/ }).click()
    await expect(page.getByRole('heading', { name: 'A Mysterious Seed' })).toBeVisible()
    await checkA11y(page, 'story: chapter reader')
  })
})

test.describe('progress', () => {
  test('a fresh, empty profile', async ({ page }) => {
    await page.goto('/#/progress')
    await expect(page.getByText('0 of 2', { exact: true })).toBeVisible()
    await checkA11y(page, 'Progress (empty)')
  })
})

test.describe('library', () => {
  test('browsing and the filter sheet', async ({ page }) => {
    await page.goto('/#/library')
    await expect(page.getByPlaceholder('Search exercises')).toBeVisible()
    await checkA11y(page, 'Library')

    await page.getByRole('button', { name: /^Filter|^Filters/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
    await checkA11y(page, 'Library: filter sheet')
  })
})

test.describe('exercise detail', () => {
  test('a curated exercise', async ({ page }) => {
    await page.goto('/#/library')
    await page.getByPlaceholder('Search exercises').fill('squat')
    await page.getByRole('link', { name: /Bodyweight Squat/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
    await checkA11y(page, 'Exercise detail')
  })
})

test.describe('routine builder and detail', () => {
  test('building a custom routine, then its detail page', async ({ page }) => {
    await page.goto('/#/routines/new')
    await expect(page.getByRole('heading', { name: 'New routine' })).toBeVisible()
    await checkA11y(page, 'Routine builder (empty)')

    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await expect(page.getByRole('heading', { name: 'Add exercise' })).toBeVisible()
    await checkA11y(page, 'Routine builder: exercise picker')

    await page.getByRole('button', { name: /Mini Squat/ }).first().click()
    await page.getByPlaceholder('Routine name').fill('A11y Test Routine')
    await checkA11y(page, 'Routine builder (with an exercise)')

    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByRole('heading', { name: 'A11y Test Routine' })).toBeVisible()
    await checkA11y(page, 'Routine detail (custom)')
  })

  test('a curated routine, read-only', async ({ page }) => {
    await page.goto('/#/routines/fs.full-body-a')
    await expect(page.getByRole('heading', { name: 'Full-Body A' })).toBeVisible()
    await checkA11y(page, 'Routine detail (curated)')
  })
})

test.describe('garden', () => {
  test('with grown flowers, and the lore sheet for a discovered and an undiscovered species', async ({ page }) => {
    await page.goto('/#/garden')
    await expect(page.getByRole('heading', { name: 'Your garden' })).toBeVisible()
    await checkA11y(page, 'Garden (empty)')

    const common = GARDEN_SPECIES.find((s) => s.rarity === 'common')!
    await seedSessions(page, [{ sessionId: idForSpecies(common.id, 'e2e-a11y-garden'), endedAt: new Date(Date.UTC(2026, 0, 2, 10, 0, 0)).toISOString() }])
    await reload(page, '/#/garden')
    await checkA11y(page, 'Garden (with a grown flower)')

    const discoveredTile = page.getByRole('listitem', { name: new RegExp(`^${common.name}, Common`) })
    await discoveredTile.getByRole('button').click()
    await expect(page.getByTestId('lore-sheet')).toBeVisible()
    await checkA11y(page, 'Garden: lore sheet (discovered)')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('lore-sheet')).toHaveCount(0)

    const legendary = GARDEN_SPECIES.find((s) => s.rarity === 'legendary')!
    await page.getByRole('listitem', { name: 'Not found yet, Legendary' }).getByRole('button').click()
    await expect(page.getByTestId('lore-sheet')).toBeVisible()
    await checkA11y(page, 'Garden: lore sheet (undiscovered)')
  })
})

test.describe('recap', () => {
  test('a finished week, opened from Today', async ({ page }) => {
    test.setTimeout(150_000)
    await page.clock.install({ time: new Date(2026, 9, 4, 12) }) // Sunday
    await page.goto('/#/checkin/fs.quick-10')
    await page.getByRole('button', { name: 'Start workout' }).click()
    await finishWorkout(page)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/')
    const entry = page.getByRole('link', { name: /Your week in bloom/ })
    await expect(entry).toBeVisible()
    await entry.click()
    await expect(page.getByRole('heading', { name: 'Your week in bloom' })).toBeVisible()
    await checkA11y(page, 'Recap')
  })
})

test.describe('schedule', () => {
  test('the weekly plan, with a day expanded', async ({ page }) => {
    await page.goto('/#/schedule')
    await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible()
    await checkA11y(page, 'Schedule (collapsed)')

    await page.getByRole('button', { name: /^Monday/ }).click()
    await checkA11y(page, 'Schedule (a day expanded)')
  })
})

test.describe('settings', () => {
  test('grouped settings, the emblem sheet, and the import-backup sheet', async ({ page }) => {
    await page.goto('/')
    await dismissWelcome(page)
    await page.evaluate(() => {
      localStorage.setItem(
        'workout-app:profiles',
        JSON.stringify({ profiles: [{ id: 'default', name: 'Alex' }], activeId: 'default' })
      )
    })
    const pink = GARDEN_SPECIES.find((s) => s.id === 'pink-bloom')!
    await seedSessions(page, [
      { sessionId: idForSpecies(pink.id, 'e2e-a11y-emblem'), endedAt: new Date(Date.UTC(2026, 0, 1, 10, 0, 0)).toISOString() },
    ])
    await reload(page, '/#/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await checkA11y(page, 'Settings')

    const emblemRow = page.getByRole('button', { name: 'Emblem' })
    await emblemRow.click()
    await expect(page.getByRole('dialog', { name: 'Choose an emblem' })).toBeVisible()
    await checkA11y(page, 'Settings: emblem sheet')
    await page.keyboard.press('Escape')

    // Round-trip a real backup through the file input to open the import
    // confirmation sheet without hand-crafting a bundle file.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save a backup' }).click()
    const download = await downloadPromise
    const path = await download.path()
    if (path) {
      await page.locator('input[type="file"]').setInputFiles(path)
      await expect(page.getByRole('dialog', { name: 'Import backup' })).toBeVisible()
      await checkA11y(page, 'Settings: import backup sheet')
    }
  })
})

test.describe('legal and info pages', () => {
  test('Privacy', async ({ page }) => {
    await page.goto('/#/privacy')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await checkA11y(page, 'Privacy')
  })

  test('Terms', async ({ page }) => {
    await page.goto('/#/terms')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await checkA11y(page, 'Terms')
  })

  test('Licenses', async ({ page }) => {
    await page.goto('/#/licenses')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await checkA11y(page, 'Licenses')
  })

  test('About', async ({ page }) => {
    await page.goto('/#/about')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await checkA11y(page, 'About')
  })

  test('Meet Rae', async ({ page }) => {
    await page.goto('/#/rae')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await checkA11y(page, 'Meet Rae')
  })
})
