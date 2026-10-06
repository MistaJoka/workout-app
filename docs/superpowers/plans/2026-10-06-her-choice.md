# Her Choice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hearts on moves, an automatic "Her mix" routine, a "Surprise me" reveal, and a Short/Usual/Long length dial on the Start screen.

**Architecture:** Pure domain functions (`herMix.ts`, `lengthDial.ts`, `surprise.ts`) hold every rule. A new additive Dexie table (`favorites`, v6) stores hearts with tombstones, so backups merge correctly. The UI stays one tap per action: a heart toggle on Exercise Detail, tiles on Today and Library, a segmented dial on Start, and a `/surprise` reveal route.

**Tech Stack:** Vite, React 18, TypeScript, Dexie (IndexedDB), Zod, Vitest (fake-indexeddb is already wired), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-her-choice-design.md`

## Global Constraints

- Schema versions are additive only (`src/infrastructure/db/schema.ts`). New table: `favorites: 'exerciseId, updatedAt'` in `this.version(6)`.
- Domain logic in `src/domain/` is pure TypeScript and never imports from `src/presentation/`.
- A started SessionPlan is immutable; scaled sets are baked in at Start.
- Her mix id is exactly `'her-mix'`, its name exactly `'Her mix'`. It needs at least 3 shown hearted moves and uses at most the 8 most recent.
- Length: Short = 1 set per move; Long = +1 set per move, capped at 4; Usual = unchanged. The default is always Usual.
- Reason codes: `LENGTH_SHORT`, `LENGTH_LONG`.
- A Short plan never creates a progression candidate and never moves a failure streak.
- Visible text: names, numbers and at most one short Rae line per screen. Full meaning goes in `aria-label`.
- Motion: `full`, `reduced` and `off` must never remove information. Page animations never use `transform` on ancestors of fixed bars.
- Fixed bottom bars use `ThumbBar` with an `armKey`.
- Never hardcode a root-absolute URL (use `asset()`).
- `npm run check` must be green before every commit. Playwright runs with `--workers=1` or `2` (machine limit).
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HeMTkw6SwwvNTzEzt48Gkw
  ```

## Review Focus

1. **Her mix drops below 3 hearts** while it's scheduled, or while its Start screen is open. Expected: Start shows the existing "That workout isn't available" path, Today falls back to its default primary, and nothing crashes. Pinned in Task 3 (catalog) and Task 5 (e2e).
2. **A hearted move later becomes hidden** (`isShownNow` false, e.g. it needs a prop). Expected: it's left out of Her mix and doesn't count toward the 3. Pinned in Task 1.
3. **A backup from before hearts existed** (no `favorites` key) imports cleanly, and another profile's backup never touches hearts. Pinned in Task 2.
4. **Un-heart, then import an older backup where it was hearted.** Expected: it stays un-hearted. Pinned in Task 2.
5. **Surprise me when the pool is only the last-done routine** (e.g. a fresh profile that only ever did Full-Body A, with drafts excluded). Expected: it still picks a routine, never an empty reveal. Pinned in Task 7.

---

### Task 1: Default prescription in the domain + `buildHerMix`

**Files:**
- Create: `src/domain/content/defaultPrescription.ts`
- Modify: `src/presentation/screens/routineBuilderRows.ts` (re-export from the domain; remove the local function body)
- Create: `src/domain/content/herMix.ts`
- Test: `src/domain/content/herMix.test.ts`

**Interfaces:**
- Produces: `defaultPrescription(exercise: Exercise): WorkoutTemplate['exercises'][number]['prescription']` (same behavior as today).
- Produces: `HER_MIX_ID = 'her-mix'`, `HER_MIX_MIN = 3`, `HER_MIX_MAX = 8`, `type Heart = { exerciseId: string; updatedAt: string }`, `buildHerMix(hearts: readonly Heart[], lookup: (id: string) => Exercise | undefined): WorkoutTemplate | null`.

- [ ] **Step 1: Move `defaultPrescription`**

Create `src/domain/content/defaultPrescription.ts`, holding the exact body and comment currently in `routineBuilderRows.ts`:

```ts
import type { Exercise, WorkoutTemplate } from './types'

// A new move's starting prescription, used by the routine builder, "Add to a
// routine" and Her mix. Start unloaded: the library is home-friendly, and a
// made-up load (it used to be 20 kg) is worse than the lifter dialling in
// their own.
export function defaultPrescription(exercise: Exercise): WorkoutTemplate['exercises'][number]['prescription'] {
  const timed = !exercise.prescriptionCapabilities.reps
  const weighted = exercise.prescriptionCapabilities.weight === true
  return {
    sets: 3,
    ...(timed ? { timeSeconds: 30 } : { reps: 10 }),
    restSeconds: weighted ? 90 : 60,
    ...(weighted ? { weightKg: 0 } : {}),
  }
}
```

In `routineBuilderRows.ts`, delete the function and add `export { defaultPrescription } from '../../domain/content/defaultPrescription'`. Run `npx vitest run src/presentation/screens/routineBuilderRows.test.ts`. Expected: PASS (behavior unchanged).

- [ ] **Step 2: Write the failing tests**

`src/domain/content/herMix.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildHerMix, HER_MIX_ID, type Heart } from './herMix'
import { exerciseById } from './fixtures/foundationStrengthStarter'
import { isShownNow } from './library'
import type { Exercise } from './types'

const ids = [...exerciseById.keys()]
const lookup = (id: string) => exerciseById.get(id)
const heart = (exerciseId: string, minute: number): Heart => ({
  exerciseId,
  updatedAt: new Date(Date.UTC(2026, 9, 6, 10, minute)).toISOString(),
})

describe('buildHerMix', () => {
  it('needs at least 3 hearted moves', () => {
    expect(buildHerMix([heart(ids[0], 1), heart(ids[1], 2)], lookup)).toBeNull()
  })

  it('builds a routine in heart order with default prescriptions', () => {
    const mix = buildHerMix([heart(ids[2], 3), heart(ids[0], 1), heart(ids[1], 2)], lookup)!
    expect(mix.id).toBe(HER_MIX_ID)
    expect(mix.name).toBe('Her mix')
    expect(mix.exercises.map((e) => e.exerciseId)).toEqual([ids[0], ids[1], ids[2]])
    expect(mix.exercises.map((e) => e.order)).toEqual([0, 1, 2])
    expect(mix.exercises[0].prescription.sets).toBe(3)
  })

  it('keeps only the 8 most recent hearts', () => {
    const many = ids.slice(0, 9).map((id, i) => heart(id, i))
    const mix = buildHerMix(many, lookup)!
    expect(mix.exercises).toHaveLength(8)
    expect(mix.exercises[0].exerciseId).toBe(ids[1])
  })

  it('skips moves that are unknown or hidden now, and they do not count toward 3', () => {
    const hidden: Exercise = { ...exerciseById.get(ids[0])!, id: 'lib.hidden', equipment: ['barbell'] } as Exercise
    expect(isShownNow(hidden)).toBe(false)
    const withHidden = (id: string) => (id === 'lib.hidden' ? hidden : lookup(id))
    expect(buildHerMix([heart('lib.hidden', 1), heart('lib.gone', 2), heart(ids[0], 3), heart(ids[1], 4)], withHidden)).toBeNull()
  })

  it('versions the mix by its moves, so a plan records which mix it ran', () => {
    const a = buildHerMix([heart(ids[0], 1), heart(ids[1], 2), heart(ids[2], 3)], lookup)!
    const b = buildHerMix([heart(ids[0], 1), heart(ids[1], 2), heart(ids[3], 3)], lookup)!
    expect(Number.isInteger(a.version)).toBe(true)
    expect(a.version).not.toBe(b.version)
  })
})
```

Before writing the hidden-move test, check `isShownNow` in `src/domain/content/library.ts` and adjust the `hidden` fixture so it really is hidden. For example, use the field `equipmentOf` reads; the assertion `expect(isShownNow(hidden)).toBe(false)` guards this.

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run src/domain/content/herMix.test.ts`. Expected: FAIL, cannot resolve `./herMix`.

- [ ] **Step 4: Implement**

`src/domain/content/herMix.ts`:

```ts
import { defaultPrescription } from './defaultPrescription'
import { isShownNow } from './library'
import type { Exercise, WorkoutTemplate } from './types'
import { PACK_ID } from './fixtures/foundationStrengthStarter'

export const HER_MIX_ID = 'her-mix'
export const HER_MIX_MIN = 3
export const HER_MIX_MAX = 8

export type Heart = { exerciseId: string; updatedAt: string }

// Her mix: a routine made from the moves she hearted, built on the fly
// (never stored). Oldest heart first, the 8 most recent kept; moves that
// are gone or hidden right now don't count. Its version is a hash of the
// move ids, so each plan records exactly which mix it ran.
export function buildHerMix(
  hearts: readonly Heart[],
  lookup: (id: string) => Exercise | undefined
): WorkoutTemplate | null {
  const shown = [...hearts]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .map((h) => lookup(h.exerciseId))
    .filter((e): e is Exercise => e !== undefined && isShownNow(e))
    .slice(-HER_MIX_MAX)
  if (shown.length < HER_MIX_MIN) return null
  return {
    id: HER_MIX_ID,
    packId: PACK_ID,
    name: 'Her mix',
    version: hashIds(shown.map((e) => e.id)),
    exercises: shown.map((e, order) => ({
      exerciseId: e.id,
      exerciseVersion: e.version,
      order,
      prescription: defaultPrescription(e),
    })),
  }
}

function hashIds(ids: readonly string[]): number {
  let hash = 0x811c9dc5
  for (const ch of ids.join(',')) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
```

First check `WorkoutTemplate` and `WorkoutTemplateExercise` in `src/domain/content/types.ts` (lines 53-75) and match the exact field names (`exerciseVersion`, `order`, `packId`, `version`, plus any other required fields such as `description`). Also check that `PACK_ID` is exported from `foundationStrengthStarter.ts`; if it isn't, export it. If `Exercise` has no `version` field, use what the starter fixture's `ex()` helper puts in `exerciseVersion`.

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run src/domain/content/herMix.test.ts src/presentation/screens/routineBuilderRows.test.ts`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/content/defaultPrescription.ts src/domain/content/herMix.ts src/domain/content/herMix.test.ts src/presentation/screens/routineBuilderRows.ts src/domain/content/fixtures/foundationStrengthStarter.ts
git commit -m "feat(her-mix): build a routine from hearted moves"
```

---

### Task 2: Hearts persistence + backup merge

**Files:**
- Modify: `src/infrastructure/db/schema.ts` (type + `version(6)` + table field)
- Create: `src/infrastructure/db/repositories/favoritesRepository.ts`
- Test: `src/infrastructure/db/repositories/favoritesRepository.test.ts`
- Modify: `src/infrastructure/exportImport/exportImport.ts` (`ALL_TABLES`, `ExportBundle`, `exportAll`, `importAll`)
- Modify: `src/infrastructure/exportImport/bundleSchema.ts` (`favorites` optional array)
- Test: extend `src/infrastructure/exportImport/exportImport.test.ts`

**Interfaces:**
- Produces: `type FavoriteRecord = { exerciseId: string; hearted: boolean; updatedAt: string }`.
- Produces: `setHeart(exerciseId: string, hearted: boolean, at?: Date): Promise<void>`, `isHearted(exerciseId: string): Promise<boolean>`, `listHearts(): Promise<Heart[]>` (only rows with `hearted: true`, mapped to `{ exerciseId, updatedAt }`).

- [ ] **Step 1: Write the failing repository tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { isHearted, listHearts, setHeart } from './favoritesRepository'

beforeEach(async () => {
  await db.favorites.clear()
})

describe('favoritesRepository', () => {
  it('hearts and un-hearts a move, keeping a tombstone', async () => {
    await setHeart('fs.plank', true, new Date(2026, 9, 6, 10))
    expect(await isHearted('fs.plank')).toBe(true)
    await setHeart('fs.plank', false, new Date(2026, 9, 6, 11))
    expect(await isHearted('fs.plank')).toBe(false)
    expect(await db.favorites.get('fs.plank')).toMatchObject({ hearted: false })
  })

  it('lists only hearted moves', async () => {
    await setHeart('fs.plank', true)
    await setHeart('fs.dead-bug', true)
    await setHeart('fs.dead-bug', false)
    expect((await listHearts()).map((h) => h.exerciseId)).toEqual(['fs.plank'])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails** (`npx vitest run src/infrastructure/db/repositories/favoritesRepository.test.ts`). Expected: FAIL.

- [ ] **Step 3: Schema + repository**

In `schema.ts`, add next to the other record types:

```ts
// Hearted moves (v6). Un-hearting keeps the row (hearted: false) so a backup
// import can't revive it; merges are newest-wins by updatedAt.
export type FavoriteRecord = { exerciseId: string; hearted: boolean; updatedAt: string }
```

Add the field `favorites!: EntityTable<FavoriteRecord, 'exerciseId'>` and, after `version(5)`:

```ts
    // v6: hearted moves (Her mix). Additive only.
    this.version(6).stores({
      favorites: 'exerciseId, updatedAt',
    })
```

`favoritesRepository.ts`:

```ts
import { db } from '../schema'
import type { Heart } from '../../../domain/content/herMix'

export async function setHeart(exerciseId: string, hearted: boolean, at: Date = new Date()): Promise<void> {
  await db.favorites.put({ exerciseId, hearted, updatedAt: at.toISOString() })
}

export async function isHearted(exerciseId: string): Promise<boolean> {
  return (await db.favorites.get(exerciseId))?.hearted === true
}

export async function listHearts(): Promise<Heart[]> {
  const rows = await db.favorites.toArray()
  return rows.filter((r) => r.hearted).map(({ exerciseId, updatedAt }) => ({ exerciseId, updatedAt }))
}
```

- [ ] **Step 4: Run the repository tests.** Expected: PASS.

- [ ] **Step 5: Write the failing backup tests** (append to `exportImport.test.ts`, following its existing setup and helpers. Read the top of the file for how bundles and other profiles are built.)

```ts
it('exports hearts and merges them newest-wins, a newer un-heart surviving an older backup', async () => {
  await setHeart('fs.plank', true, new Date(2026, 9, 1))
  const old = await exportAll()
  await setHeart('fs.plank', false, new Date(2026, 9, 5))
  await importAll(old)
  expect(await isHearted('fs.plank')).toBe(false)
  expect(old.favorites).toEqual([expect.objectContaining({ exerciseId: 'fs.plank', hearted: true })])
})

it('a backup without favorites imports cleanly', async () => {
  const bundle = await exportAll()
  delete (bundle as { favorites?: unknown }).favorites
  expect(parseExportBundle(bundle).ok).toBe(true)
  await expect(importAll(bundle)).resolves.toMatchObject({ state: 'merged' })
})

it("another profile's backup never touches hearts", async () => {
  const bundle = { ...(await exportAll()), profile: { id: 'someone-else', name: 'X' }, favorites: [{ exerciseId: 'fs.plank', hearted: true, updatedAt: '2030-01-01T00:00:00.000Z' }] }
  await importAll(bundle)
  expect(await isHearted('fs.plank')).toBe(false)
})
```

Also add `db.favorites.clear()` to that file's `beforeEach`.

- [ ] **Step 6: Run it to confirm it fails.** Then implement:
  - `ALL_TABLES`: add `db.favorites`.
  - `ExportBundle`: `favorites?: FavoriteRecord[]` (comment: "Added with DB v6 (hearts); optional for the same reason.").
  - `exportAll`: `favorites: await db.favorites.toArray(),`
  - `importAll`, inside the `!other` part after body weight: `await putNewer<FavoriteRecord>(db.favorites, bundle.favorites ?? [], (r) => r.exerciseId, (r) => r.updatedAt)`
  - `bundleSchema.ts`: `const favorite = z.object({ exerciseId: z.string().min(1), hearted: z.boolean(), updatedAt: isoLike }).passthrough()` and `favorites: z.array(favorite).optional(),`

- [ ] **Step 7: Run** `npx vitest run src/infrastructure`. Expected: PASS.

- [ ] **Step 8: Commit** `feat(hearts): store hearted moves; backups merge them newest-wins`.

---

### Task 3: Catalog resolves Her mix

**Files:**
- Modify: `src/domain/content/catalog.ts`
- Test: `src/domain/content/catalog.test.ts`

**Interfaces:**
- Consumes: `buildHerMix`, `HER_MIX_ID`, `listHearts`.
- Produces: `getHerMix(): Promise<WorkoutTemplate | null>`. `getTemplate('her-mix')` returns it, or `undefined` when there are fewer than 3 shown hearts. `listAllTemplates()` returns `{ curated, custom, herMix }`, where `herMix: WorkoutTemplate | null`.

- [ ] **Step 1: Failing tests** (append to `catalog.test.ts`, with `db.favorites.clear()` in `beforeEach`):

```ts
it('resolves her-mix only once three shown moves are hearted', async () => {
  await setHeart('fs.bodyweight-squat', true, new Date(2026, 9, 6, 1))
  await setHeart('fs.plank', true, new Date(2026, 9, 6, 2))
  expect(await getTemplate('her-mix')).toBeUndefined()
  await setHeart('fs.dead-bug', true, new Date(2026, 9, 6, 3))
  expect((await getTemplate('her-mix'))?.exercises.map((e) => e.exerciseId)).toEqual([
    'fs.bodyweight-squat',
    'fs.plank',
    'fs.dead-bug',
  ])
  expect((await listAllTemplates()).herMix?.id).toBe('her-mix')
  await setHeart('fs.plank', false)
  expect(await getTemplate('her-mix')).toBeUndefined()
})
```

- [ ] **Step 2: Run it to confirm it fails.**

- [ ] **Step 3: Implement**

```ts
import { buildHerMix, HER_MIX_ID } from './herMix'
import { listHearts } from '../../infrastructure/db/repositories/favoritesRepository'

export async function getHerMix(): Promise<WorkoutTemplate | null> {
  const hearts = await listHearts()
  if (hearts.length === 0) return null
  const found = await getExercises(hearts.map((h) => h.exerciseId))
  return buildHerMix(hearts, (id) => found.get(id))
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  if (id === HER_MIX_ID) return (await getHerMix()) ?? undefined
  return curatedTemplateById.get(id) ?? (await getCustomTemplate(id))
}

export async function listAllTemplates(): Promise<{ curated: WorkoutTemplate[]; custom: WorkoutTemplate[]; herMix: WorkoutTemplate | null }> {
  const [custom, herMix] = await Promise.all([listCustomTemplates(), getHerMix()])
  return { curated: foundationStrengthStarterTemplates, custom, herMix }
}
```

`getExercises` is defined further down in the same file; function hoisting makes this fine.

- [ ] **Step 4: Callers of `listAllTemplates`.** In `src/presentation/screens/ScheduleScreen.tsx:52` and `src/infrastructure/reminders.ts:71`, read how `curated`/`custom` are used and add `...(herMix ? [herMix] : [])` to the routine list they build, so Her mix can be scheduled and named in reminders. Run `npx tsc -b`. Expected: no errors.

- [ ] **Step 5: Run** `npx vitest run src/domain/content src/infrastructure`. Expected: PASS.

- [ ] **Step 6: Commit** `feat(her-mix): resolve her-mix in the catalog, schedule and reminders`.

---

### Task 4: Heart toggle + Library ♥ filter

**Files:**
- Create: `src/presentation/components/HeartButton.tsx`
- Modify: `src/presentation/screens/ExerciseDetailScreen.tsx` (header row near line 86)
- Modify: `src/presentation/screens/LibraryScreen.tsx` (chip next to "Rae demos", around line 205; heart mark on list rows)
- Modify: `src/index.css` (heart pop, full motion only)
- Test: `e2e/hearts.spec.ts`

**Interfaces:**
- Consumes: `setHeart`, `isHearted`, `listHearts`.
- Produces: `<HeartButton exerciseId name />` (self-loading; it has `aria-pressed`, and its `aria-label` is `Heart ${name}` or `Un-heart ${name}`).

- [ ] **Step 1: Failing e2e**

```ts
import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

test('hearting a move marks it and filters the Library to hearted moves', async ({ page }) => {
  await page.goto('/#/exercise/fs.plank')
  await dismissWelcome(page)
  const heart = page.getByRole('button', { name: 'Heart Plank' })
  await heart.click()
  await expect(page.getByRole('button', { name: 'Un-heart Plank' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('about:blank')
  await page.goto('/#/library')
  await page.getByRole('button', { name: /^♥/ }).click()
  await expect(page.getByRole('link', { name: /Plank/ }).first()).toBeVisible()
  await expect(page.getByText('1 exercise')).toBeVisible()
})
```

Check the real exercise name for `fs.plank` in `foundationStrengthStarter.ts` (around line 125) and the count label format in `LibraryScreen` (`countLabel`), and adjust both selectors to match exactly.

- [ ] **Step 2: Build and run it to confirm it fails:** `npm run build && npx playwright test --project=chromium --workers=1 e2e/hearts.spec.ts`.

- [ ] **Step 3: HeartButton**

```tsx
import { useEffect, useState } from 'react'
import { isHearted, setHeart } from '../../infrastructure/db/repositories/favoritesRepository'

// One tap hearts a move for Her mix; a second tap un-hearts it. Full
// motion pops the heart (index.css); reduced/off just swaps the glyph.
export function HeartButton({ exerciseId, name }: { exerciseId: string; name: string }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [popKey, setPopKey] = useState(0)
  useEffect(() => {
    let cancelled = false
    isHearted(exerciseId).then((v) => {
      if (!cancelled) setOn(v)
    })
    return () => {
      cancelled = true
    }
  }, [exerciseId])
  async function toggle() {
    const next = !on
    setOn(next)
    if (next) setPopKey((k) => k + 1)
    try {
      await setHeart(exerciseId, next)
    } catch {
      setOn(!next)
    }
  }
  return (
    <button
      type="button"
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-2xl active:bg-field-primary"
      aria-pressed={on === true}
      aria-label={on ? `Un-heart ${name}` : `Heart ${name}`}
      disabled={on === null}
      onClick={() => void toggle()}
    >
      <span key={popKey} aria-hidden="true" className={on ? 'heart-pop text-primary' : 'text-ink-muted'}>
        {on ? '♥' : '♡'}
      </span>
    </button>
  )
}
```

CSS (next to the tap-stage block):

```css
@keyframes heart-pop { 0% { transform: scale(0.6); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
[data-motion='full'] .heart-pop { display: inline-block; animation: heart-pop 0.35s ease-out; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .heart-pop { animation: none; } }
```

- [ ] **Step 4: Exercise Detail.** Wrap the `<h1>` in `<div className="flex items-start justify-between gap-2">`, with `<HeartButton exerciseId={exercise.id} name={exercise.name} />` after it.

- [ ] **Step 5: Library.** Add state `const [hearted, setHearted] = useState<ReadonlySet<string>>(new Set())` and `const [heartOnly, setHeartOnly] = useState(false)`. Load it with `listHearts().then((h) => setHearted(new Set(h.map((x) => x.exerciseId))))` in a mount effect. Apply it in the `results` memo: `.filter((e) => !heartOnly || hearted.has(e.id))`. Add `heartOnly` to `filtering`. Next to the "Rae demos" chip, render it only when `hearted.size > 0`:

```tsx
<button
  type="button"
  aria-pressed={heartOnly}
  aria-label={`Hearted moves only, ${hearted.size}`}
  onClick={() => {
    setLimit(PAGE)
    setHeartOnly((on) => !on)
  }}
  className={`chip ${heartOnly ? 'chip-active' : ''}`}
>
  ♥ {hearted.size}
</button>
```

Wrap both chips in a `flex gap-2` span so they sit together. In each result row, add `{hearted.has(exercise.id) && <span aria-hidden className="text-primary">♥</span>}` after the name, and append `, hearted` to the row's accessible name if it has one.

- [ ] **Step 6: Run the e2e again.** Expected: PASS. Also run `npx playwright test --project=chromium --workers=1 e2e/library-rae.spec.ts e2e/exercise-you.spec.ts` (neighbors). Expected: PASS.

- [ ] **Step 7: `npm run check`**, then commit `feat(hearts): heart a move; Library filters to hearted moves`.

---

### Task 5: Her mix tiles on Today and Library

**Files:**
- Modify: `src/presentation/screens/TodayScreen.tsx` (`loadToday` adds `herMix`; the "Workouts" row renders it first)
- Modify: `src/presentation/screens/LibraryScreen.tsx` (Routines row renders it first, linking to `/checkin/her-mix`)
- Test: `e2e/her-mix.spec.ts`

**Interfaces:**
- Consumes: `getHerMix()`.

- [ ] **Step 1: Failing e2e**

```ts
import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome } from './helpers'

async function heart(page: Page, id: string) {
  await page.goto('about:blank')
  await page.goto(`/#/exercise/${id}`)
  await dismissWelcome(page)
  await page.getByRole('button', { name: /^Heart / }).click()
  await expect(page.getByRole('button', { name: /^Un-heart / })).toBeVisible()
}

test('three hearts make Her mix, which starts like any routine', async ({ page }) => {
  await heart(page, 'fs.bodyweight-squat')
  await heart(page, 'fs.plank')
  await page.goto('about:blank')
  await page.goto('/')
  await expect(page.getByRole('link', { name: /^Her mix/ })).toHaveCount(0)
  await heart(page, 'fs.dead-bug')
  await page.goto('about:blank')
  await page.goto('/')
  await page.getByRole('link', { name: /^Her mix/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Her mix' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Your workout' }).getByRole('listitem')).toHaveCount(3)
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
})

test('Her mix gone (un-hearted below 3): its Start link shows not available', async ({ page }) => {
  await page.goto('/#/checkin/her-mix')
  await expect(page.getByText("That workout isn't available.")).toBeVisible()
})
```

- [ ] **Step 2: Run it to confirm it fails.**

- [ ] **Step 3: Today.** In `loadToday`, fetch `getHerMix()` in parallel with what it already loads, and prepend `{ template: herMix, custom: false, herMix: true }` to `others` when it's non-null and isn't `hideId`. Widen the type of `others` entries with `herMix?: boolean`. In the render, when `herMix` is true, use `name={\`Her mix, your hearted moves, ${describe(template)}\`}`, `short="Her mix"`, and the art `<span className="relative">{still img or 🌸}<span aria-hidden className="absolute -right-1 -top-1 text-sm text-primary">♥</span></span>`.

- [ ] **Step 4: Library.** Load `getHerMix()` in the same effect that loads `custom`, store it in state, and render a `TodayTile` first in the Routines row, with `to="/checkin/her-mix"`, `name={\`Her mix, ${countLabel(mix.exercises.length, 'exercise')}\`}`, `short="Her mix"`, the same stills art plus a ♥ badge, and `value={\`⏱${estimateMinutes(mix)}\`}`.

- [ ] **Step 5: Run the e2e and** `e2e/today-layout.spec.ts e2e/routine-detail.spec.ts`. Expected: PASS.

- [ ] **Step 6: `npm run check`**, then commit `feat(her-mix): Her mix tile on Today and Library`.

---

### Task 6: Length dial (domain + plan + progression)

**Files:**
- Create: `src/domain/session/lengthDial.ts`
- Test: `src/domain/session/lengthDial.test.ts`
- Modify: `src/domain/session/types.ts` (`ReasonCode` += `'LENGTH_SHORT' | 'LENGTH_LONG'`; `SessionPlan.length?: WorkoutLength`)
- Modify: `src/domain/session/createSessionPlan.ts` (param `length?: WorkoutLength`)
- Modify: `src/domain/adaptation/evaluateSessionProgression.ts` (short plans are no evidence)
- Test: extend `src/domain/session/createSessionPlan.test.ts`, `src/domain/adaptation/evaluateSessionProgression.test.ts`

**Interfaces:**
- Produces: `type WorkoutLength = 'short' | 'usual' | 'long'`, `LONG_MAX_SETS = 4`, `scaleTemplate(template: WorkoutTemplate, length: WorkoutLength): WorkoutTemplate`, `lengthDecisions(template: WorkoutTemplate, length: WorkoutLength): AdaptationDecision[]`.

- [ ] **Step 1: Failing tests** (`lengthDial.test.ts`):

```ts
import { describe, expect, it } from 'vitest'
import { lengthDecisions, scaleTemplate } from './lengthDial'
import { templateById } from '../content/fixtures/foundationStrengthStarter'
import { ROTATION } from '../content/fixtures/foundationStrengthStarter'

const fullBodyA = templateById.get(ROTATION[0])!

describe('scaleTemplate', () => {
  it('usual changes nothing', () => {
    expect(scaleTemplate(fullBodyA, 'usual')).toBe(fullBodyA)
  })
  it('short is one set of every move, nothing else touched', () => {
    const short = scaleTemplate(fullBodyA, 'short')
    expect(short.exercises.map((e) => e.prescription.sets)).toEqual(fullBodyA.exercises.map(() => 1))
    expect(short.exercises.map((e) => ({ ...e.prescription, sets: 0 }))).toEqual(
      fullBodyA.exercises.map((e) => ({ ...e.prescription, sets: 0 }))
    )
  })
  it('long adds one set, capped at 4', () => {
    const four = { ...fullBodyA, exercises: fullBodyA.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets: 4 } })) }
    expect(scaleTemplate(fullBodyA, 'long').exercises[0].prescription.sets).toBe(fullBodyA.exercises[0].prescription.sets + 1)
    expect(scaleTemplate(four, 'long').exercises.every((e) => e.prescription.sets === 4)).toBe(true)
  })
  it('records an inspectable reason per move', () => {
    expect(lengthDecisions(fullBodyA, 'usual')).toEqual([])
    expect(lengthDecisions(fullBodyA, 'short')[0]).toMatchObject({ reasonCode: 'LENGTH_SHORT' })
    expect(lengthDecisions(fullBodyA, 'long')).toHaveLength(fullBodyA.exercises.length)
  })
})
```

In `createSessionPlan.test.ts`:

```ts
it('bakes the length into the plan', () => {
  const plan = createSessionPlanFromTemplate({ ...baseParams, length: 'short' })
  expect(plan.length).toBe('short')
  expect(plan.exercises.every((e) => e.sets === 1)).toBe(true)
  expect(plan.adaptations.some((a) => a.reasonCode === 'LENGTH_SHORT')).toBe(true)
})
it('a usual plan carries no length field, so its hash is unchanged', () => {
  expect('length' in createSessionPlanFromTemplate(baseParams)).toBe(false)
})
```

Use whatever params fixture that file already builds; rename `baseParams` to match.

In `evaluateSessionProgression.test.ts`, write a test where a plan with `length: 'short'` has every set logged with `met: true` at the rep ceiling. Every outcome should be `reasonCode: 'RETAINED'` with `preservePending: true` and an unchanged `nextFailureStreak`. Copy that file's existing "all sets met → PROGRESSION_CANDIDATE" test and add `length: 'short'` to its plan, so the only difference is the flag.

- [ ] **Step 2: Run them to confirm they fail.**

- [ ] **Step 3: Implement** `lengthDial.ts`:

```ts
import type { WorkoutTemplate } from '../content/types'
import type { AdaptationDecision } from './types'

export type WorkoutLength = 'short' | 'usual' | 'long'
export const LONG_MAX_SETS = 4

// The Start screen's Short / Usual / Long. Shortening cuts sets, never
// moves (owner, 2026-10-06): same variety, less time. Only sets change.
export function scaleTemplate(template: WorkoutTemplate, length: WorkoutLength): WorkoutTemplate {
  if (length === 'usual') return template
  return {
    ...template,
    exercises: template.exercises.map((e) => ({
      ...e,
      prescription: {
        ...e.prescription,
        sets: length === 'short' ? 1 : e.prescription.sets >= LONG_MAX_SETS ? e.prescription.sets : e.prescription.sets + 1,
      },
    })),
  }
}

export function lengthDecisions(template: WorkoutTemplate, length: WorkoutLength): AdaptationDecision[] {
  if (length === 'usual') return []
  return template.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    reasonCode: length === 'short' ? 'LENGTH_SHORT' : 'LENGTH_LONG',
    detail: length === 'short' ? 'Short workout: one set of each move.' : 'Long workout: one more set of each move.',
  }))
}
```

In `types.ts`, extend `ReasonCode`. Add `length?: WorkoutLength` to `SessionPlan`, with a comment saying absent means usual; import the type from `./lengthDial`.

In `createSessionPlan.ts`, add the `length?: WorkoutLength` param. At the top of the function, use `const scaled = length ? scaleTemplate(template, length) : template` and use `scaled` everywhere `template` is read for exercises/adaptations. Then `adaptations: [...adaptTemplate(scaled, checkIn, rules), ...lengthDecisions(template, length ?? 'usual')]`, and in `base`: `...(length && length !== 'usual' ? { length } : {})`.

In `evaluateSessionProgression.ts`, inside the loop, right after the `setEvents.length === 0` check:

```ts
    // A Short workout (one set each, Start screen dial) is no evidence
    // either way, like a workout ended early.
    if (plan.length === 'short') {
      results.push({
        exerciseId: exercise.exerciseId,
        reasonCode: 'RETAINED',
        detail: 'A short workout, so nothing changes.',
        nextPrescribedReps: currentPrescribedReps,
        nextLoad: weighted ? state.currentWeightKg ?? exercise.weightKg ?? 0 : 0,
        nextFailureStreak: state.consecutiveFailureStreak,
        weighted,
        preservePending: true,
      })
      continue
    }
```

This needs `state`, `currentPrescribedReps` and `weighted` declared above it. Place it after their declarations (after line 46), not before.

- [ ] **Step 4: Run** `npx vitest run src/domain`. Expected: PASS. Also check that `bundleSchema.ts` accepts `length` (the plan object is `.passthrough()`, so no change is needed). Confirm it with a one-line test in `exportImport.test.ts` that exports and re-parses a plan with `length: 'short'`.

- [ ] **Step 5: `npm run check`**, then commit `feat(length): Short/Usual/Long scales sets; short plans are no progression evidence`.

---

### Task 7: Length dial on the Start screen

**Files:**
- Modify: `src/presentation/screens/CheckInScreen.tsx`
- Create: `src/presentation/components/LengthDial.tsx`
- Test: `e2e/length-dial.spec.ts`

**Interfaces:**
- Consumes: `WorkoutLength`, `scaleTemplate`, `estimateMinutes`, and `createSessionPlanFromTemplate({ ..., length })`.

- [ ] **Step 1: Failing e2e**

```ts
import { expect, test } from '@playwright/test'
import { dismissWelcome, finishWorkout } from './helpers'

test('Short runs one set of every move and offers no next level', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: 'Start workout' }).click()
  await expect(page.getByRole('radio', { name: /Usual/ })).toBeChecked()
  await page.getByRole('radio', { name: /Short/ }).click()
  await expect(page.getByRole('list', { name: 'Your workout' })).toContainText('1 ×')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByText('Set 1 of 1', { exact: true })).toBeVisible()
  await finishWorkout(page)
  await expect(page.getByRole('button', { name: /try it/i })).toHaveCount(0)
})
```

Check `SessionCompleteScreen` for the exact next-level confirm label ("Yes, try it" per memory) and match it.

- [ ] **Step 2: Run it to confirm it fails.**

- [ ] **Step 3: LengthDial component** (a radiogroup; each segment shows its minutes):

```tsx
import type { WorkoutLength } from '../../domain/session/lengthDial'

const LABELS: Record<WorkoutLength, string> = { short: 'Short', usual: 'Usual', long: 'Long' }

// Short / Usual / Long, each with its own estimate. Always starts on Usual
// (the parent owns the state and never persists it).
export function LengthDial({
  value,
  minutes,
  onChange,
}: {
  value: WorkoutLength
  minutes: Record<WorkoutLength, number>
  onChange: (length: WorkoutLength) => void
}) {
  return (
    <div role="radiogroup" aria-label="Workout length" className="grid grid-cols-3 gap-2">
      {(['short', 'usual', 'long'] as const).map((length) => (
        <button
          key={length}
          type="button"
          role="radio"
          aria-checked={value === length}
          aria-label={`${LABELS[length]}, about ${minutes[length]} min`}
          onClick={() => onChange(length)}
          className={`chip min-h-11 flex-col !py-1 ${value === length ? 'chip-active' : ''}`}
        >
          <span className="text-sm font-bold">{LABELS[length]}</span>
          <span aria-hidden className="hud-num text-xs">⏱{minutes[length]}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wire into CheckInScreen.** Add `const [length, setLength] = useState<WorkoutLength>('usual')`. Change `buildPlan(loaded, length)` to pass `length` into `createSessionPlanFromTemplate`. The `preview` memo depends on `[loaded, length]`. Compute minutes per length with `estimateMinutes(scaleTemplate(loaded.template, l))` and replace `const minutes = estimateMinutes(loaded.template)` with `minutes[length]`. Render `<LengthDial value={length} minutes={...} onChange={setLength} />` directly under the title block (above "Warm up first"). `handleStart` uses `buildPlan(loaded, length)`. Leave the ThumbBar `armKey` as `"checkin"`, since the bar's content doesn't change.

- [ ] **Step 5: Run the e2e, plus** `e2e/start-flow.spec.ts e2e/start-preview.spec.ts`. Expected: PASS. Check a screenshot at 361×399 (Flip cover screen) to confirm the dial doesn't push Start off-screen. Start is in the fixed bar, so only the list scrolls.

- [ ] **Step 6: `npm run check`**, then commit `feat(length): Short/Usual/Long dial on the Start screen`.

---

### Task 8: Surprise me

**Files:**
- Create: `src/domain/content/surprise.ts`
- Test: `src/domain/content/surprise.test.ts`
- Create: `src/presentation/screens/SurpriseScreen.tsx`
- Modify: `src/App.tsx` (lazy route `/surprise`, next to `/garden`)
- Modify: `src/presentation/screens/TodayScreen.tsx` (a 🎲 tile at the start of the Workouts row)
- Modify: `src/index.css` (reel animation, full motion only)
- Test: `e2e/surprise.spec.ts`

**Interfaces:**
- Produces: `surprisePool(input: { curated: WorkoutTemplate[]; custom: WorkoutTemplate[]; herMix: WorkoutTemplate | null; lastTemplateId: string | null; draftIds: ReadonlySet<string> }): WorkoutTemplate[]` and `pickSurprise(pool: readonly WorkoutTemplate[], random?: () => number): WorkoutTemplate | null`.

- [ ] **Step 1: Failing unit tests**

```ts
import { describe, expect, it } from 'vitest'
import { pickSurprise, surprisePool } from './surprise'
import type { WorkoutTemplate } from './types'

const t = (id: string) => ({ id, name: id, exercises: [] }) as unknown as WorkoutTemplate

describe('surprisePool', () => {
  it('leaves out drafts and the last routine done', () => {
    const pool = surprisePool({ curated: [t('a'), t('b'), t('draft')], custom: [t('mine')], herMix: t('her-mix'), lastTemplateId: 'a', draftIds: new Set(['draft']) })
    expect(pool.map((p) => p.id)).toEqual(['b', 'mine', 'her-mix'])
  })
  it('keeps the last routine when it is the only one left', () => {
    const pool = surprisePool({ curated: [t('a'), t('draft')], custom: [], herMix: null, lastTemplateId: 'a', draftIds: new Set(['draft']) })
    expect(pool.map((p) => p.id)).toEqual(['a'])
  })
})

describe('pickSurprise', () => {
  it('uses the injected random', () => {
    expect(pickSurprise([t('a'), t('b'), t('c')], () => 0.99)?.id).toBe('c')
    expect(pickSurprise([t('a'), t('b'), t('c')], () => 0)?.id).toBe('a')
  })
  it('returns null for an empty pool', () => {
    expect(pickSurprise([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails.**

- [ ] **Step 3: Implement** `surprise.ts`:

```ts
import type { WorkoutTemplate } from './types'

// Surprise me: any of her routines except drafts and the one she did last,
// unless that one is all there is. Plain random: a UI choice, not adaptation.
export function surprisePool(input: {
  curated: WorkoutTemplate[]
  custom: WorkoutTemplate[]
  herMix: WorkoutTemplate | null
  lastTemplateId: string | null
  draftIds: ReadonlySet<string>
}): WorkoutTemplate[] {
  const all = [...input.curated, ...input.custom, ...(input.herMix ? [input.herMix] : [])].filter(
    (t) => !input.draftIds.has(t.id)
  )
  const fresh = all.filter((t) => t.id !== input.lastTemplateId)
  return fresh.length > 0 ? fresh : all
}

export function pickSurprise(pool: readonly WorkoutTemplate[], random: () => number = Math.random): WorkoutTemplate | null {
  if (pool.length === 0) return null
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}
```

Run the unit tests. Expected: PASS.

- [ ] **Step 4: Failing e2e**

```ts
import { expect, test } from '@playwright/test'
import { dismissWelcome } from './helpers'

test('Surprise me lands on a Start screen', async ({ page }) => {
  await page.goto('/')
  await dismissWelcome(page)
  await page.getByRole('link', { name: /^Surprise me/ }).click()
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible({ timeout: 8_000 })
})

test('reduced motion shows the pick at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/surprise')
  await dismissWelcome(page)
  await expect(page.getByTestId('surprise-result')).toBeVisible({ timeout: 500 })
})
```

- [ ] **Step 5: SurpriseScreen.** Load `listAllTemplates()` and `getAllSessionHistory()`. `lastTemplateId` is the `templateId` of the plan whose result has the latest `endedAt`. Build the pool with `DRAFT_TEMPLATE_IDS` and pick once (in a `useRef`, so re-renders don't re-roll). Get the effective motion with `useTheme().motion` plus `usePrefersReducedMotion()` through `effectiveMotion`.
  - **Full motion:** render a reel, a vertical strip of 12 cards cycling through the pool's names with the chosen one last, inside a fixed-height window with `overflow: hidden`. The strip animates `margin-top` (not `transform`, though this screen has no fixed bar anyway) over 1.2s ease-out. On `animationend`, show the result.
  - **Reduced/off:** show the result immediately.
  - **Result:** a `data-testid="surprise-result"` card with the routine name in large type, `<RaeFace expression="happy" size={72} motion="pop" />` and `playCelebration('badge', feedback)`. After 900ms, `navigate(\`/checkin/${pick.id}\`, { replace: true })`.
  - Tapping anywhere during the spin jumps to the result.
  - An empty pool (it can't happen with curated routines, but just in case) shows a `<BackButton />` and nothing else.
  - The screen has `<BackButton />` at the top and an `aria-live="polite"` region announcing `Picked: ${name}`.

CSS:

```css
@keyframes surprise-reel { from { margin-top: 0; } to { margin-top: var(--reel-end); } }
[data-motion='full'] .surprise-reel { animation: surprise-reel 1.2s cubic-bezier(0.15, 0.85, 0.25, 1) forwards; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .surprise-reel { animation: none; } }
```

Set `--reel-end` inline to `-(11 * cardHeight)px`, using a fixed card height of 72px.

Route in `App.tsx`: `const SurpriseScreen = lazy(() => import('./presentation/screens/SurpriseScreen').then((m) => ({ default: m.SurpriseScreen })))` and `<Route path="/surprise" element={<SurpriseScreen />} />`.

Today: as the first child of the "Workouts"/"Or pick another" `TileRow`, add `<TodayTile to="/surprise" name="Surprise me: pick a workout for me" short="Surprise me" art={<span className="text-3xl">🎲</span>} />`.

- [ ] **Step 6: Run the e2e, plus** `e2e/today-layout.spec.ts e2e/motion.spec.ts`. Expected: PASS.

- [ ] **Step 7: `npm run check`**, then commit `feat(surprise): Surprise me reel picks today's routine`.

---

### Task 9: Docs, full verification, ship

**Files:**
- Modify: `CLAUDE.md` (Hard product constraints: one line each for hearts/Her mix, the length dial and Surprise me; Navigation: `/surprise` is a secondary route)
- Modify: `docs/SOURCE_OF_TRUTH_V07.md` only if it lists the DB schema versions or the session plan fields (grep for `version(5)` / `weeklyGoal`)

- [ ] **Step 1: Add the CLAUDE.md lines:**
  - `- Hearts (`favorites`, DB v6, tombstoned, newest-wins on import) build **Her mix** (`domain/content/herMix.ts`, id `her-mix`, ≥3 shown hearts, latest 8, default prescriptions, never stored; resolved by `catalog.getTemplate`).`
  - `- Start screen length dial (`domain/session/lengthDial.ts`): Short = 1 set each, Long = +1 (max 4), default Usual, never remembered. Baked into the plan (`length`, reason codes `LENGTH_SHORT/LONG`); a Short plan is never progression evidence.`
  - `- Surprise me (`/surprise`, `domain/content/surprise.ts`): random among non-draft routines + Her mix, never the last one done unless it's the only one.`
- [ ] **Step 2:** `npm run check`. Expected: all green.
- [ ] **Step 3:** `npx playwright test --project=chromium --workers=2`. Expected: all pass. The known flaky `rewards.spec.ts` "Hubby Bunny's shop" strict-mode match passes on rerun; if it fails, rerun it alone and report it.
- [ ] **Step 4:** Commit the docs, then `git fetch origin`. Merge if origin moved, then `npm run build && systemctl --user restart workout-app.service`, then push.
- [ ] **Step 5:** `npm run apk`, `adb -s R5CN80AKWXB install --user 0 -r release/foundation-strength-<ver>.apk`, then `cd android && ./gradlew --stop`.
