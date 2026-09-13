# v0.6 Domain & Persistence Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note:** this plan implements the *current* `docs/SOURCE_OF_TRUTH_V06.md` / `CLAUDE.md` governance. It is not part of the legacy pre-reconciliation prototype described in `docs/superpowers/LEGACY_NOTICE.md` — it supersedes it.

**Goal:** Replace the legacy Next.js/Supabase MVP with a framework-appropriate offline-first foundation — pure content/session domain types, IndexedDB persistence via Dexie, an event-sourced session engine with idempotent completion, and the salvaged session-machine/timer concepts — with zero UI screens yet. This covers reconciliation steps 3-8 from `SOURCE_OF_TRUTH_V06.md` §15. Steps 9-14 (Today/Library/Progress/Settings/Workout Player screens, theme engine, offline/export hardening) are a follow-up plan, gated on real content data landing via `support/CLAUDE_REQUESTS.md` REQ-20260913-001/002.

**Architecture:** `CLAUDE.md` and `SOURCE_OF_TRUTH_V06.md` §2/§13 explicitly exclude a backend/server database and forbid Server Actions as persistence, while requiring the app to work offline after install. Next.js's App Router is architecturally built around a server (Server Components, Server Actions, a Node process) — fighting that model for a zero-backend, fully-offline SPA is a forcing constraint against keeping Next.js. This plan replaces it with a plain **Vite + React 19 + TypeScript SPA**, keeping Tailwind (theme-agnostic utility classes; the real theme-token system is a later phase) and porting the legacy `lib/session-machine.ts` state-transition logic and `Timer.tsx`'s timestamp-based (not decrementing-counter) rest-timer math into the new domain layer, per `CLAUDE.md`'s "Legacy prototype treatment" section. The legacy code is fully preserved on branch `legacy-mvp-2026-09-13`, so this plan deletes it from `master` rather than leaving two frameworks side by side.

Domain logic lives under `src/domain/` as pure, framework-independent TypeScript (no React, no Dexie imports) per `CLAUDE.md`'s architecture rules ("Domain logic must be pure TypeScript and framework-independent" / "React components must not contain adaptation/progression/programming logic"). Persistence lives under `src/infrastructure/db/`. Sessions are event-sourced: a `SessionState` is always derived by replaying persisted `SessionEvent`s against an immutable `SessionPlan`, never mutated directly — this is what makes "refresh restores exact session position" (§4) and "double taps must not duplicate completed-set/session events" (`CLAUDE.md`) true by construction (idempotency keyed on a client-generated `eventId`, deduped both in the pure reducer and at the persistence layer). Note: the legacy machine's `goBack` (reload a prior set and re-log it) is **deliberately not ported** — `SOURCE_OF_TRUTH_V06.md` §4 requires "completed historical truth is immutable," and `goBack`-then-relog was the exact mechanism that produced a duplicate-set bug in the legacy app. v0.6's screens (§3) describe "How To" / "Adjust Exercise" as the Workout Player's sub-interactions, not a literal undo — there is nothing to port here, not a gap to request.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7, Dexie 4 (IndexedDB), Zod 3 (schema validation), Vitest 2 + `fake-indexeddb` (IndexedDB polyfill for tests), Tailwind CSS 3 (utility classes only, no theme tokens yet).

**Spec:** `docs/SOURCE_OF_TRUTH_V06.md` (binding authority) and `CLAUDE.md` (implementation contract that argues from it). Read both before starting; this plan quotes the binding constraints below but the spec documents govern any conflict.

## Global Constraints

- One private user; no account/auth system in V1 (`CLAUDE.md`).
- No backend, no Supabase, no runtime database server in V1 (`CLAUDE.md`, `SOURCE_OF_TRUTH_V06.md` §2).
- No runtime AI/LLM/image generation, no camera/microphone capture, no chatbot (`CLAUDE.md`).
- Local persistence uses IndexedDB; Dexie is the preferred wrapper (`CLAUDE.md`).
- Domain logic must be pure TypeScript and framework-independent; React components must not contain adaptation/progression/programming logic (`CLAUDE.md`).
- Canonical workout templates are immutable authored content; a started session must never be reconstructed from mutable canonical workout data (`CLAUDE.md`).
- Rest timers reconstruct from persisted timestamps, not an in-memory decrement counter (`CLAUDE.md`, `SOURCE_OF_TRUTH_V06.md` §3 "Rest").
- Double taps must not duplicate completed-set/session events (`CLAUDE.md`); set/event completion is idempotent (`SOURCE_OF_TRUTH_V06.md` §4).
- Completed historical truth is immutable (`SOURCE_OF_TRUTH_V06.md` §4).
- Every material adaptation decision carries a machine-readable reason code (`CLAUDE.md`, `SOURCE_OF_TRUTH_V06.md` §7).
- Do not invent exercises, substitutions, equipment, progression edges, or safety rules — request via `support/CLAUDE_REQUESTS.md` instead (`CLAUDE.md`).
- Export/import JSON backup is required (`SOURCE_OF_TRUTH_V06.md` §6).
- Prefer the smallest correct diff; do not broaden scope opportunistically (`CLAUDE.md`).

---

### Task 1: Vite/React/TS scaffold, remove legacy Next.js/Supabase stack

**Files:**
- Delete: `app/`, `components/`, `lib/actions/`, `lib/supabase/`, `lib/types.ts`, `lib/session-machine.ts`, `lib/session-machine.test.ts`, `supabase/`, `next.config.ts`, `next-env.d.ts`, `.env.local`, `tests/manifest.test.ts`, `tests/schema.test.ts`, `tests/seed.test.ts`, `tests/setup.ts`, `tests/actions/`
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `tailwind.config.ts`, `tests/setup.ts`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing (all legacy code this deletes is fully preserved on branch `legacy-mvp-2026-09-13`)
- Produces: a buildable, testable Vite+React+TS+Tailwind skeleton every later task builds on; `tests/setup.ts` installs the `fake-indexeddb` polyfill every Dexie-touching test in later tasks needs

- [ ] **Step 1: Delete the legacy Next.js/Supabase application code**

```bash
git rm -r app components lib/actions lib/supabase lib/types.ts lib/session-machine.ts lib/session-machine.test.ts supabase next.config.ts next-env.d.ts tests/manifest.test.ts tests/schema.test.ts tests/seed.test.ts tests/setup.ts tests/actions
rm -f .env.local
```

Expected: all listed paths removed from the working tree and staged for deletion. `lib/` and `tests/` directories may now be empty except for what later steps create — that's fine, they're recreated by later tasks.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "workout-app",
  "version": "0.6.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "dexie": "4.0.10",
    "zod": "3.24.1"
  },
  "devDependencies": {
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "@vitejs/plugin-react": "4.3.4",
    "typescript": "5.7.2",
    "vite": "6.0.7",
    "vitest": "2.1.8",
    "fake-indexeddb": "6.0.0",
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 6: Create `tests/setup.ts`**

```ts
import 'fake-indexeddb/auto'
```

This installs a fake `indexedDB` global so Dexie (used from Task 5 onward) works under Vitest's Node environment without a real browser.

- [ ] **Step 7: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 8: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Workout App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create `src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Workout App</h1>
      <p className="text-sm text-gray-500">v0.6 foundation phase — no screens yet.</p>
    </div>
  )
}
```

- [ ] **Step 11: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 12: Update `.gitignore`**

```
node_modules
dist
.env.local
```

- [ ] **Step 13: Install dependencies and verify the build**

Run: `rm -f package-lock.json && npm install && npm run build`
Expected: build succeeds, prints a `dist/` output summary with no errors.

- [ ] **Step 14: Verify the (currently empty) test run doesn't error**

Run: `npx vitest run`
Expected: exits successfully reporting no test files found (there are none yet — later tasks add them). This confirms the Vitest/fake-indexeddb wiring itself doesn't crash on startup.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: replace Next.js/Supabase stack with Vite+React+TS foundation per v0.6"
```

---

### Task 2: Content domain types and schema validation

**Files:**
- Create: `src/domain/content/types.ts`
- Create: `src/domain/content/schema.ts`
- Create: `src/domain/content/schema.test.ts`
- Create: `src/domain/content/fixtures/placeholderPack.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `Exercise`, `WorkoutTemplate`, `WorkoutTemplateExercise`, `ContentPack` types; `validateContentPack(pack, exercises, templates): ValidationResult` — consumed by Task 8's adaptation engine (which takes a `WorkoutTemplate`) and by the later UI-phase plan when real content packs land

- [ ] **Step 1: Create `src/domain/content/types.ts`**

```ts
export type ExerciseId = string

export type Exercise = {
  id: ExerciseId
  version: number
  name: string
  aliases: string[]
  taxonomy: {
    category: string
    equipment: string[]
  }
  setup: string
  executionPhases: string[]
  cues: string[]
  commonErrors: string[]
  prescriptionCapabilities: {
    reps: boolean
    time: boolean
    hold: boolean
  }
  mediaManifest: {
    hero?: string
    start?: string
    mid?: string
    finish?: string
    sequence?: string[]
    loopVideo?: string
  }
  provenance: {
    author: string
    reviewedAt: string | null
    status: 'draft' | 'reviewed' | 'approved'
  }
}

export type WorkoutTemplateExercise = {
  exerciseId: ExerciseId
  exerciseVersion: number
  prescription: {
    sets: number
    reps?: number
    timeSeconds?: number
    restSeconds: number
  }
  order: number
  optional: boolean
}

export type WorkoutTemplate = {
  id: string
  version: number
  name: string
  packId: string
  exercises: WorkoutTemplateExercise[]
}

export type ContentPack = {
  id: string
  version: number
  name: string
  dependsOn: string[]
  exerciseIds: ExerciseId[]
  templateIds: string[]
}
```

- [ ] **Step 2: Write the failing schema validation test**

```ts
// src/domain/content/schema.test.ts
import { describe, expect, it } from 'vitest'
import { validateContentPack } from './schema'
import type { ContentPack, Exercise, WorkoutTemplate } from './types'

const exercise: Exercise = {
  id: 'placeholder.test-exercise',
  version: 1,
  name: 'Placeholder Test Exercise',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions.',
  executionPhases: ['Placeholder phase'],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
  ],
}

const pack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.test-exercise'],
  templateIds: ['placeholder.test-template'],
}

describe('validateContentPack', () => {
  it('accepts a pack whose templates/exercises are all present and referentially consistent', () => {
    const result = validateContentPack(pack, [exercise], [template])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects a pack referencing a template ID that is not provided', () => {
    const brokenPack: ContentPack = { ...pack, templateIds: ['missing.template'] }
    const result = validateContentPack(brokenPack, [exercise], [template])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.template'))).toBe(true)
  })

  it('rejects a template referencing an exercise ID/version that is not provided', () => {
    const brokenTemplate: WorkoutTemplate = {
      ...template,
      exercises: [{ ...template.exercises[0], exerciseId: 'missing.exercise' }],
    }
    const result = validateContentPack(pack, [exercise], [brokenTemplate])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.exercise'))).toBe(true)
  })

  it('rejects a pack referencing an exercise ID that is not provided', () => {
    const brokenPack: ContentPack = { ...pack, exerciseIds: ['missing.exercise'] }
    const result = validateContentPack(brokenPack, [exercise], [template])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.exercise'))).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/domain/content/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 4: Implement `src/domain/content/schema.ts`**

```ts
import { z } from 'zod'
import type { ContentPack, Exercise, WorkoutTemplate } from './types'

const exerciseSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  taxonomy: z.object({
    category: z.string().min(1),
    equipment: z.array(z.string()),
  }),
  setup: z.string(),
  executionPhases: z.array(z.string()),
  cues: z.array(z.string()),
  commonErrors: z.array(z.string()),
  prescriptionCapabilities: z.object({
    reps: z.boolean(),
    time: z.boolean(),
    hold: z.boolean(),
  }),
  mediaManifest: z.object({
    hero: z.string().optional(),
    start: z.string().optional(),
    mid: z.string().optional(),
    finish: z.string().optional(),
    sequence: z.array(z.string()).optional(),
    loopVideo: z.string().optional(),
  }),
  provenance: z.object({
    author: z.string(),
    reviewedAt: z.string().nullable(),
    status: z.enum(['draft', 'reviewed', 'approved']),
  }),
})

const workoutTemplateSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  packId: z.string().min(1),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      exerciseVersion: z.number().int().positive(),
      prescription: z.object({
        sets: z.number().int().positive(),
        reps: z.number().int().positive().optional(),
        timeSeconds: z.number().int().positive().optional(),
        restSeconds: z.number().int().nonnegative(),
      }),
      order: z.number().int().nonnegative(),
      optional: z.boolean(),
    })
  ),
})

const contentPackSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  dependsOn: z.array(z.string()),
  exerciseIds: z.array(z.string()),
  templateIds: z.array(z.string()),
})

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateContentPack(
  pack: ContentPack,
  exercises: Exercise[],
  templates: WorkoutTemplate[]
): ValidationResult {
  const errors: string[] = []

  const packParse = contentPackSchema.safeParse(pack)
  if (!packParse.success) {
    errors.push(`Pack ${pack.id} failed schema validation: ${packParse.error.message}`)
  }

  for (const exercise of exercises) {
    const exerciseParse = exerciseSchema.safeParse(exercise)
    if (!exerciseParse.success) {
      errors.push(`Exercise ${exercise.id} failed schema validation: ${exerciseParse.error.message}`)
    }
  }

  for (const template of templates) {
    const templateParse = workoutTemplateSchema.safeParse(template)
    if (!templateParse.success) {
      errors.push(`Template ${template.id} failed schema validation: ${templateParse.error.message}`)
    }
  }

  const exerciseById = new Map(exercises.map((e) => [`${e.id}@${e.version}`, e]))
  const templateById = new Map(templates.map((t) => [t.id, t]))

  for (const templateId of pack.templateIds) {
    if (!templateById.has(templateId)) {
      errors.push(`Pack ${pack.id} references missing template: ${templateId}`)
    }
  }

  for (const exerciseId of pack.exerciseIds) {
    const exists = exercises.some((e) => e.id === exerciseId)
    if (!exists) {
      errors.push(`Pack ${pack.id} references missing exercise: ${exerciseId}`)
    }
  }

  for (const template of templates) {
    for (const templateExercise of template.exercises) {
      const key = `${templateExercise.exerciseId}@${templateExercise.exerciseVersion}`
      if (!exerciseById.has(key)) {
        errors.push(
          `Template ${template.id} references missing exercise/version: ${templateExercise.exerciseId}@${templateExercise.exerciseVersion}`
        )
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/domain/content/schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Create the placeholder fixture**

```ts
// src/domain/content/fixtures/placeholderPack.ts
//
// PLACEHOLDER CONTENT — not real product data.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-001.
// Exists only so the schema-validation and domain layers have something
// concrete to validate/exercise against before real exercise/workout
// content is promoted from the ChatGPT-side R&D reservoir into this repo.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'

export const placeholderExercise: Exercise = {
  id: 'placeholder.test-exercise',
  version: 1,
  name: 'Placeholder Test Exercise',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase'],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

export const placeholderTemplate: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
  ],
}

export const placeholderPack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.test-exercise'],
  templateIds: ['placeholder.test-template'],
}
```

- [ ] **Step 7: Verify the full test suite still passes**

Run: `npx vitest run`
Expected: PASS (4 tests, 1 file).

- [ ] **Step 8: Commit**

```bash
git add src/domain/content
git commit -m "feat: add content domain types, schema validation, and placeholder fixture"
```

---

### Task 3: Session domain types and reproducibility hash

**Files:**
- Create: `src/domain/session/types.ts`
- Create: `src/domain/session/reproducibilityHash.ts`
- Create: `src/domain/session/reproducibilityHash.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `ReasonCode`, `AdaptationDecision`, `SessionPlanExercise`, `SessionPlan`, `SessionEventType`, `SessionEvent`, `SessionStatus`, `SessionState`, `SessionResult` types; `computeReproducibilityHash(plan): string` — consumed by Task 4 (session machine), Task 5 (Dexie schema), Task 6 (session service), Task 8 (adaptation engine reuses `ReasonCode`/`AdaptationDecision`)

- [ ] **Step 1: Create `src/domain/session/types.ts`**

```ts
export type ReasonCode =
  | 'RETAINED'
  | 'REMOVED_OPTIONAL'
  | 'ADJUSTED_WITHIN_BOUNDS'
  | 'SUBSTITUTED_EQUIVALENT'
  | 'REGRESSED'
  | 'PROGRESSION_CANDIDATE'
  | 'SESSION_COMPRESSED'

export type AdaptationDecision = {
  exerciseId: string
  reasonCode: ReasonCode
  detail: string
}

export type SessionPlanExercise = {
  exerciseId: string
  exerciseVersion: number
  sets: number
  reps?: number
  timeSeconds?: number
  restSeconds: number
  order: number
}

export type SessionPlan = {
  id: string
  templateId: string
  templateVersion: number
  packId: string
  ruleVersion: string
  createdAt: string
  exercises: SessionPlanExercise[]
  adaptations: AdaptationDecision[]
  reproducibilityHash: string
}

export type SessionEventType =
  | 'SESSION_STARTED'
  | 'SET_COMPLETED'
  | 'REST_ENDED'
  | 'REST_SKIPPED'
  | 'PAUSED'
  | 'RESUMED'
  | 'SESSION_COMPLETED'
  | 'SESSION_COMPLETED_SHORTENED'

export type SessionEvent = {
  eventId: string
  sessionId: string
  type: SessionEventType
  timestamp: string
  payload: Record<string, unknown>
}

export type SessionStatus =
  | 'DRAFT'
  | 'READY'
  | 'ACTIVE'
  | 'RESTING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'COMPLETED_SHORTENED'

export type SessionState = {
  status: SessionStatus
  currentExerciseIndex: number
  currentSetNumber: number
  restStartedAt: string | null
  restEndsAt: string | null
  appliedEventIds: string[]
}

export type SessionResult = {
  sessionId: string
  planId: string
  status: 'COMPLETED' | 'COMPLETED_SHORTENED'
  startedAt: string
  endedAt: string
  totalSetsCompleted: number
  totalSetsPlanned: number
}
```

- [ ] **Step 2: Write the failing reproducibility hash test**

```ts
// src/domain/session/reproducibilityHash.test.ts
import { describe, expect, it } from 'vitest'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { SessionPlan } from './types'

const basePlan: Omit<SessionPlan, 'reproducibilityHash'> = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [
    {
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      order: 0,
    },
  ],
  adaptations: [{ exerciseId: 'placeholder.test-exercise', reasonCode: 'RETAINED', detail: 'no adaptation' }],
}

describe('computeReproducibilityHash', () => {
  it('is deterministic for identical input', () => {
    const hash1 = computeReproducibilityHash(basePlan)
    const hash2 = computeReproducibilityHash(basePlan)
    expect(hash1).toBe(hash2)
  })

  it('changes when the exercise prescription changes', () => {
    const changedPlan = {
      ...basePlan,
      exercises: [{ ...basePlan.exercises[0], sets: 4 }],
    }
    expect(computeReproducibilityHash(changedPlan)).not.toBe(computeReproducibilityHash(basePlan))
  })

  it('changes when the adaptation decisions change', () => {
    const changedPlan = {
      ...basePlan,
      adaptations: [{ exerciseId: 'placeholder.test-exercise', reasonCode: 'ADJUSTED_WITHIN_BOUNDS' as const, detail: 'reduced volume' }],
    }
    expect(computeReproducibilityHash(changedPlan)).not.toBe(computeReproducibilityHash(basePlan))
  })

  it('is not affected by object key order', () => {
    const reordered = { ...basePlan, createdAt: basePlan.createdAt, id: basePlan.id }
    expect(computeReproducibilityHash(reordered)).toBe(computeReproducibilityHash(basePlan))
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/domain/session/reproducibilityHash.test.ts`
Expected: FAIL — `Cannot find module './reproducibilityHash'`.

- [ ] **Step 4: Implement `src/domain/session/reproducibilityHash.ts`**

```ts
import type { SessionPlan } from './types'

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
  return `{${entries.join(',')}}`
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function computeReproducibilityHash(plan: Omit<SessionPlan, 'reproducibilityHash'>): string {
  return fnv1a32(stableStringify(plan))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/domain/session/reproducibilityHash.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/session/types.ts src/domain/session/reproducibilityHash.ts src/domain/session/reproducibilityHash.test.ts
git commit -m "feat: add session domain types and deterministic reproducibility hash"
```

---

### Task 4: Event-sourced session state machine (ports legacy session-machine.ts)

**Files:**
- Create: `src/domain/session/sessionMachine.ts`
- Create: `src/domain/session/sessionMachine.test.ts`

**Interfaces:**
- Consumes: `SessionPlan`, `SessionPlanExercise`, `SessionEvent`, `SessionState`, `SessionStatus` from Task 3
- Produces: `initSessionState(): SessionState`, `applyEvent(plan, state, event): SessionState`, `replayEvents(plan, events): SessionState` — consumed by Task 6's session service

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/session/sessionMachine.test.ts
import { describe, expect, it } from 'vitest'
import { applyEvent, initSessionState, replayEvents } from './sessionMachine'
import type { SessionEvent, SessionPlan } from './types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [
    { exerciseId: 'ex1', exerciseVersion: 1, sets: 2, reps: 8, restSeconds: 90, order: 0 },
    { exerciseId: 'ex2', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 1 },
  ],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

function event(partial: Partial<SessionEvent> & Pick<SessionEvent, 'eventId' | 'type'>): SessionEvent {
  return {
    sessionId: plan.id,
    timestamp: '2026-09-13T00:00:00.000Z',
    payload: {},
    ...partial,
  }
}

describe('initSessionState', () => {
  it('starts in DRAFT at exercise 0, set 1, with no applied events', () => {
    expect(initSessionState()).toEqual({
      status: 'DRAFT',
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      restStartedAt: null,
      restEndsAt: null,
      appliedEventIds: [],
    })
  })
})

describe('applyEvent', () => {
  it('SESSION_STARTED moves DRAFT to ACTIVE', () => {
    const state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    expect(state.status).toBe('ACTIVE')
    expect(state.appliedEventIds).toEqual(['e1'])
  })

  it('SET_COMPLETED on a non-final set moves to RESTING, targeting the next set of the same exercise', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const resting = applyEvent(
      plan,
      active,
      event({ eventId: 'e2', type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z' })
    )
    expect(resting.status).toBe('RESTING')
    expect(resting.currentExerciseIndex).toBe(0)
    expect(resting.currentSetNumber).toBe(2)
    expect(resting.restStartedAt).toBe('2026-09-13T00:01:00.000Z')
    expect(resting.restEndsAt).toBe('2026-09-13T00:02:30.000Z')
  })

  it('SET_COMPLETED on the last set of an exercise advances to the next exercise', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'SET_COMPLETED' }))
    expect(state.status).toBe('RESTING')
    expect(state.currentExerciseIndex).toBe(1)
    expect(state.currentSetNumber).toBe(1)
  })

  it('SET_COMPLETED on the last set of the last exercise completes the session', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e5', type: 'REST_ENDED' }))
    state = applyEvent(plan, state, event({ eventId: 'e6', type: 'SET_COMPLETED' }))
    expect(state.status).toBe('COMPLETED')
  })

  it('REST_ENDED and REST_SKIPPED both clear rest and move to ACTIVE', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    const viaEnded = applyEvent(plan, state, event({ eventId: 'e3', type: 'REST_ENDED' }))
    const viaSkipped = applyEvent(plan, state, event({ eventId: 'e3b', type: 'REST_SKIPPED' }))
    expect(viaEnded.status).toBe('ACTIVE')
    expect(viaEnded.restStartedAt).toBeNull()
    expect(viaEnded.restEndsAt).toBeNull()
    expect(viaSkipped.status).toBe('ACTIVE')
    expect(viaSkipped.currentSetNumber).toBe(viaEnded.currentSetNumber)
  })

  it('PAUSED then RESUMED returns to ACTIVE when not resting', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'PAUSED' }))
    expect(state.status).toBe('PAUSED')
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'RESUMED' }))
    expect(state.status).toBe('ACTIVE')
  })

  it('PAUSED then RESUMED returns to RESTING when a rest was in progress', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    state = applyEvent(plan, state, event({ eventId: 'e3', type: 'PAUSED' }))
    state = applyEvent(plan, state, event({ eventId: 'e4', type: 'RESUMED' }))
    expect(state.status).toBe('RESTING')
  })

  it('SESSION_COMPLETED_SHORTENED marks the session shortened from any active phase', () => {
    let state = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    state = applyEvent(plan, state, event({ eventId: 'e2', type: 'SESSION_COMPLETED_SHORTENED' }))
    expect(state.status).toBe('COMPLETED_SHORTENED')
  })

  it('is idempotent: applying the same eventId twice has no additional effect', () => {
    const active = applyEvent(plan, initSessionState(), event({ eventId: 'e1', type: 'SESSION_STARTED' }))
    const once = applyEvent(plan, active, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    const twice = applyEvent(plan, once, event({ eventId: 'e2', type: 'SET_COMPLETED' }))
    expect(twice).toEqual(once)
  })
})

describe('replayEvents', () => {
  it('folds a full event log into the same state as sequential applyEvent calls', () => {
    const events: SessionEvent[] = [
      event({ eventId: 'e1', type: 'SESSION_STARTED' }),
      event({ eventId: 'e2', type: 'SET_COMPLETED' }),
      event({ eventId: 'e3', type: 'REST_ENDED' }),
    ]
    const replayed = replayEvents(plan, events)
    let manual = initSessionState()
    for (const e of events) {
      manual = applyEvent(plan, manual, e)
    }
    expect(replayed).toEqual(manual)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/session/sessionMachine.test.ts`
Expected: FAIL — `Cannot find module './sessionMachine'`.

- [ ] **Step 3: Implement `src/domain/session/sessionMachine.ts`**

```ts
import type { SessionEvent, SessionPlan, SessionState } from './types'

export function initSessionState(): SessionState {
  return {
    status: 'DRAFT',
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    restStartedAt: null,
    restEndsAt: null,
    appliedEventIds: [],
  }
}

function nextPointer(
  plan: SessionPlan,
  exerciseIndex: number,
  setNumber: number
): { exerciseIndex: number; setNumber: number } | null {
  const exercise = plan.exercises[exerciseIndex]
  if (setNumber < exercise.sets) {
    return { exerciseIndex, setNumber: setNumber + 1 }
  }
  if (exerciseIndex + 1 < plan.exercises.length) {
    return { exerciseIndex: exerciseIndex + 1, setNumber: 1 }
  }
  return null
}

export function applyEvent(plan: SessionPlan, state: SessionState, event: SessionEvent): SessionState {
  if (state.appliedEventIds.includes(event.eventId)) {
    return state
  }
  const appliedEventIds = [...state.appliedEventIds, event.eventId]

  switch (event.type) {
    case 'SESSION_STARTED':
      return { ...state, status: 'ACTIVE', appliedEventIds }

    case 'SET_COMPLETED': {
      const next = nextPointer(plan, state.currentExerciseIndex, state.currentSetNumber)
      if (next === null) {
        return { ...state, status: 'COMPLETED', restStartedAt: null, restEndsAt: null, appliedEventIds }
      }
      const restSeconds = plan.exercises[state.currentExerciseIndex].restSeconds
      const restStartedAt = event.timestamp
      const restEndsAt = new Date(new Date(restStartedAt).getTime() + restSeconds * 1000).toISOString()
      return {
        ...state,
        status: 'RESTING',
        currentExerciseIndex: next.exerciseIndex,
        currentSetNumber: next.setNumber,
        restStartedAt,
        restEndsAt,
        appliedEventIds,
      }
    }

    case 'REST_ENDED':
    case 'REST_SKIPPED':
      return { ...state, status: 'ACTIVE', restStartedAt: null, restEndsAt: null, appliedEventIds }

    case 'PAUSED':
      return { ...state, status: 'PAUSED', appliedEventIds }

    case 'RESUMED':
      return { ...state, status: state.restStartedAt ? 'RESTING' : 'ACTIVE', appliedEventIds }

    case 'SESSION_COMPLETED':
      return { ...state, status: 'COMPLETED', appliedEventIds }

    case 'SESSION_COMPLETED_SHORTENED':
      return { ...state, status: 'COMPLETED_SHORTENED', appliedEventIds }

    default:
      return { ...state, appliedEventIds }
  }
}

export function replayEvents(plan: SessionPlan, events: SessionEvent[]): SessionState {
  return events.reduce((state, event) => applyEvent(plan, state, event), initSessionState())
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/session/sessionMachine.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/session/sessionMachine.ts src/domain/session/sessionMachine.test.ts
git commit -m "feat: add event-sourced session state machine with idempotent event application"
```

---

### Task 5: Dexie IndexedDB schema and repositories

**Files:**
- Create: `src/infrastructure/db/schema.ts`
- Create: `src/infrastructure/db/repositories/sessionRepository.ts`
- Create: `src/infrastructure/db/repositories/sessionRepository.test.ts`
- Create: `src/infrastructure/db/repositories/settingsRepository.ts`
- Create: `src/infrastructure/db/repositories/familiarityProgressionRepository.ts`
- Create: `src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts`

**Interfaces:**
- Consumes: `SessionPlan`, `SessionEvent`, `SessionResult` from Task 3
- Produces: `db: WorkoutDb` (Dexie instance); `savePlan`, `getPlan`, `appendEvent`, `getEventsForSession`, `saveResult`, `getResult` from `sessionRepository`; `getSetting`, `setSetting` from `settingsRepository`; `getFamiliarity`, `recordExposure`, `getProgression`, `advanceProgression` from `familiarityProgressionRepository` — consumed by Task 6 (session service) and Task 9 (export/import)

- [ ] **Step 1: Create `src/infrastructure/db/schema.ts`**

```ts
import Dexie, { type EntityTable } from 'dexie'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

export type SettingsRecord = { key: string; value: unknown }
export type CheckInRecord = {
  id: string
  createdAt: string
  energy: number
  comfort: number
  availableMinutes: number
}
export type FamiliarityRecord = { exerciseId: string; exposureCount: number; lastSeenAt: string | null }
export type ProgressionRecord = { exerciseId: string; level: number; lastAdvancedAt: string | null }

export class WorkoutDb extends Dexie {
  settings!: EntityTable<SettingsRecord, 'key'>
  checkIns!: EntityTable<CheckInRecord, 'id'>
  sessionPlans!: EntityTable<SessionPlan, 'id'>
  sessionEvents!: EntityTable<SessionEvent, 'eventId'>
  sessionResults!: EntityTable<SessionResult, 'sessionId'>
  familiarity!: EntityTable<FamiliarityRecord, 'exerciseId'>
  progression!: EntityTable<ProgressionRecord, 'exerciseId'>

  constructor() {
    super('workout-app-v06')
    this.version(1).stores({
      settings: 'key',
      checkIns: 'id, createdAt',
      sessionPlans: 'id, templateId, createdAt',
      sessionEvents: 'eventId, sessionId, timestamp',
      sessionResults: 'sessionId, planId, endedAt',
      familiarity: 'exerciseId',
      progression: 'exerciseId',
    })
  }
}

export const db = new WorkoutDb()
```

- [ ] **Step 2: Write the failing session repository test**

```ts
// src/infrastructure/db/repositories/sessionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import * as sessionRepo from './sessionRepository'
import type { SessionEvent, SessionPlan, SessionResult } from '../../../domain/session/types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
})

describe('sessionRepository', () => {
  it('saves and retrieves a session plan', async () => {
    await sessionRepo.savePlan(plan)
    const loaded = await sessionRepo.getPlan(plan.id)
    expect(loaded).toEqual(plan)
  })

  it('returns undefined for a plan that does not exist', async () => {
    const loaded = await sessionRepo.getPlan('missing-session')
    expect(loaded).toBeUndefined()
  })

  it('appends events and retrieves them in timestamp order for a session', async () => {
    const events: SessionEvent[] = [
      { eventId: 'e2', sessionId: plan.id, type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z', payload: {} },
      { eventId: 'e1', sessionId: plan.id, type: 'SESSION_STARTED', timestamp: '2026-09-13T00:00:00.000Z', payload: {} },
    ]
    for (const event of events) {
      await sessionRepo.appendEvent(event)
    }
    const loaded = await sessionRepo.getEventsForSession(plan.id)
    expect(loaded.map((e) => e.eventId)).toEqual(['e1', 'e2'])
  })

  it('appending an event with a duplicate eventId does not create a second row', async () => {
    const event: SessionEvent = {
      eventId: 'e1',
      sessionId: plan.id,
      type: 'SESSION_STARTED',
      timestamp: '2026-09-13T00:00:00.000Z',
      payload: {},
    }
    await sessionRepo.appendEvent(event)
    await sessionRepo.appendEvent(event)
    const loaded = await sessionRepo.getEventsForSession(plan.id)
    expect(loaded).toHaveLength(1)
  })

  it('saves and retrieves a session result', async () => {
    const result: SessionResult = {
      sessionId: plan.id,
      planId: plan.id,
      status: 'COMPLETED',
      startedAt: '2026-09-13T00:00:00.000Z',
      endedAt: '2026-09-13T00:10:00.000Z',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    }
    await sessionRepo.saveResult(result)
    const loaded = await sessionRepo.getResult(plan.id)
    expect(loaded).toEqual(result)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/infrastructure/db/repositories/sessionRepository.test.ts`
Expected: FAIL — `Cannot find module './sessionRepository'`.

- [ ] **Step 4: Implement `src/infrastructure/db/repositories/sessionRepository.ts`**

```ts
import { db } from '../schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../../domain/session/types'

export async function savePlan(plan: SessionPlan): Promise<void> {
  await db.sessionPlans.put(plan)
}

export async function getPlan(id: string): Promise<SessionPlan | undefined> {
  return db.sessionPlans.get(id)
}

export async function appendEvent(event: SessionEvent): Promise<void> {
  const existing = await db.sessionEvents.get(event.eventId)
  if (existing) {
    return
  }
  await db.sessionEvents.put(event)
}

export async function getEventsForSession(sessionId: string): Promise<SessionEvent[]> {
  return db.sessionEvents.where('sessionId').equals(sessionId).sortBy('timestamp')
}

export async function saveResult(result: SessionResult): Promise<void> {
  await db.sessionResults.put(result)
}

export async function getResult(sessionId: string): Promise<SessionResult | undefined> {
  return db.sessionResults.get(sessionId)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/infrastructure/db/repositories/sessionRepository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Create `src/infrastructure/db/repositories/settingsRepository.ts`**

```ts
import { db } from '../schema'

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const record = await db.settings.get(key)
  return record?.value as T | undefined
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}
```

- [ ] **Step 7: Write the failing familiarity/progression repository test**

```ts
// src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { advanceProgression, getFamiliarity, getProgression, recordExposure } from './familiarityProgressionRepository'

beforeEach(async () => {
  await db.familiarity.clear()
  await db.progression.clear()
})

describe('familiarity', () => {
  it('starts at zero exposures for an unseen exercise', async () => {
    const familiarity = await getFamiliarity('ex1')
    expect(familiarity).toEqual({ exerciseId: 'ex1', exposureCount: 0, lastSeenAt: null })
  })

  it('increments exposure count on each recorded exposure', async () => {
    await recordExposure('ex1', '2026-09-13T00:00:00.000Z')
    await recordExposure('ex1', '2026-09-13T01:00:00.000Z')
    const familiarity = await getFamiliarity('ex1')
    expect(familiarity.exposureCount).toBe(2)
    expect(familiarity.lastSeenAt).toBe('2026-09-13T01:00:00.000Z')
  })
})

describe('progression', () => {
  it('starts at level 0 for an exercise with no progression record', async () => {
    const progression = await getProgression('ex1')
    expect(progression).toEqual({ exerciseId: 'ex1', level: 0, lastAdvancedAt: null })
  })

  it('advancing progression increments the level and records the timestamp, requiring explicit confirmation to call', async () => {
    await advanceProgression('ex1', '2026-09-13T00:00:00.000Z')
    const progression = await getProgression('ex1')
    expect(progression.level).toBe(1)
    expect(progression.lastAdvancedAt).toBe('2026-09-13T00:00:00.000Z')
  })
})
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npx vitest run src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts`
Expected: FAIL — `Cannot find module './familiarityProgressionRepository'`.

- [ ] **Step 9: Implement `src/infrastructure/db/repositories/familiarityProgressionRepository.ts`**

```ts
import { db } from '../schema'
import type { FamiliarityRecord, ProgressionRecord } from '../schema'

export async function getFamiliarity(exerciseId: string): Promise<FamiliarityRecord> {
  const existing = await db.familiarity.get(exerciseId)
  return existing ?? { exerciseId, exposureCount: 0, lastSeenAt: null }
}

export async function recordExposure(exerciseId: string, timestamp: string): Promise<void> {
  const existing = await db.familiarity.get(exerciseId)
  const next: FamiliarityRecord = {
    exerciseId,
    exposureCount: (existing?.exposureCount ?? 0) + 1,
    lastSeenAt: timestamp,
  }
  await db.familiarity.put(next)
}

export async function getProgression(exerciseId: string): Promise<ProgressionRecord> {
  const existing = await db.progression.get(exerciseId)
  return existing ?? { exerciseId, level: 0, lastAdvancedAt: null }
}

// Per SOURCE_OF_TRUTH_V06.md §8: progression requires explicit user
// confirmation. This function performs the state change only — the UI
// layer (a later phase) is responsible for gating the call behind an
// explicit "Try Next Level?" confirmation, never calling it automatically
// from exposure count alone.
export async function advanceProgression(exerciseId: string, timestamp: string): Promise<void> {
  const existing = await db.progression.get(exerciseId)
  const next: ProgressionRecord = {
    exerciseId,
    level: (existing?.level ?? 0) + 1,
    lastAdvancedAt: timestamp,
  }
  await db.progression.put(next)
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npx vitest run src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 11: Run the full suite**

Run: `npx vitest run`
Expected: all tests across all files still pass.

- [ ] **Step 12: Commit**

```bash
git add src/infrastructure/db
git commit -m "feat: add Dexie IndexedDB schema and session/settings/familiarity/progression repositories"
```

---

### Task 6: Session service — orchestrates plan creation, idempotent event recording, and result persistence

**Files:**
- Create: `src/domain/session/sessionService.ts`
- Create: `src/domain/session/sessionService.test.ts`

**Interfaces:**
- Consumes: `replayEvents`, `initSessionState` from Task 4; `SessionPlan`, `SessionEvent`, `SessionEventType`, `SessionState`, `SessionResult` from Task 3; `savePlan`, `getPlan`, `appendEvent`, `getEventsForSession`, `saveResult`, `getResult` from Task 5's `sessionRepository`
- Produces: `startSession(plan): Promise<SessionState>`, `getCurrentState(sessionId): Promise<SessionState>`, `recordEvent(sessionId, type, eventId, payload?): Promise<SessionState>` — consumed by the later UI-phase plan's Workout Player

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/session/sessionService.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../infrastructure/db/schema'
import * as sessionRepo from '../../infrastructure/db/repositories/sessionRepository'
import { getCurrentState, recordEvent, startSession } from './sessionService'
import type { SessionPlan } from './types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
})

describe('startSession', () => {
  it('persists the plan and returns an ACTIVE state', async () => {
    const state = await startSession(plan)
    expect(state.status).toBe('ACTIVE')
    const loadedPlan = await sessionRepo.getPlan(plan.id)
    expect(loadedPlan).toEqual(plan)
  })
})

describe('getCurrentState', () => {
  it('reconstructs state by replaying all persisted events for the session', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const state = await getCurrentState(plan.id)
    expect(state.status).toBe('COMPLETED')
  })

  it('throws a descriptive error if no plan exists for the session', async () => {
    await expect(getCurrentState('missing-session')).rejects.toThrow('missing-session')
  })
})

describe('recordEvent', () => {
  it('is idempotent: recording the same eventId twice does not change the outcome further', async () => {
    await startSession(plan)
    const once = await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const twice = await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    expect(twice).toEqual(once)
  })

  it('persists a SessionResult once the session completes, with correct counts', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const result = await sessionRepo.getResult(plan.id)
    expect(result).toMatchObject({
      sessionId: plan.id,
      status: 'COMPLETED',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    })
  })

  it('does not overwrite an already-persisted SessionResult on a later idempotent replay', async () => {
    await startSession(plan)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const firstResult = await sessionRepo.getResult(plan.id)
    await recordEvent(plan.id, 'SET_COMPLETED', 'evt-set-1')
    const secondResult = await sessionRepo.getResult(plan.id)
    expect(secondResult).toEqual(firstResult)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/session/sessionService.test.ts`
Expected: FAIL — `Cannot find module './sessionService'`.

- [ ] **Step 3: Implement `src/domain/session/sessionService.ts`**

```ts
import { replayEvents } from './sessionMachine'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from './types'
import * as sessionRepo from '../../infrastructure/db/repositories/sessionRepository'

export async function startSession(plan: SessionPlan): Promise<SessionState> {
  await sessionRepo.savePlan(plan)
  await sessionRepo.appendEvent({
    eventId: `${plan.id}:start`,
    sessionId: plan.id,
    type: 'SESSION_STARTED',
    timestamp: new Date().toISOString(),
    payload: {},
  })
  return getCurrentState(plan.id)
}

export async function getCurrentState(sessionId: string): Promise<SessionState> {
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    throw new Error(`No session plan found for session ${sessionId}`)
  }
  const events = await sessionRepo.getEventsForSession(sessionId)
  return replayEvents(plan, events)
}

export async function recordEvent(
  sessionId: string,
  type: SessionEventType,
  eventId: string,
  payload: Record<string, unknown> = {}
): Promise<SessionState> {
  const event: SessionEvent = {
    eventId,
    sessionId,
    type,
    timestamp: new Date().toISOString(),
    payload,
  }
  await sessionRepo.appendEvent(event)
  const state = await getCurrentState(sessionId)
  if (state.status === 'COMPLETED' || state.status === 'COMPLETED_SHORTENED') {
    await persistResultIfMissing(sessionId, state)
  }
  return state
}

async function persistResultIfMissing(sessionId: string, state: SessionState): Promise<void> {
  const existing = await sessionRepo.getResult(sessionId)
  if (existing) {
    return
  }
  const plan = await sessionRepo.getPlan(sessionId)
  if (!plan) {
    throw new Error(`No session plan found for session ${sessionId}`)
  }
  const events = await sessionRepo.getEventsForSession(sessionId)
  const startEvent = events.find((e) => e.type === 'SESSION_STARTED')
  const completedCount = events.filter((e) => e.type === 'SET_COMPLETED').length
  const totalSetsPlanned = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const result: SessionResult = {
    sessionId,
    planId: plan.id,
    status: state.status === 'COMPLETED' ? 'COMPLETED' : 'COMPLETED_SHORTENED',
    startedAt: startEvent?.timestamp ?? plan.createdAt,
    endedAt: new Date().toISOString(),
    totalSetsCompleted: completedCount,
    totalSetsPlanned,
  }
  await sessionRepo.saveResult(result)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/session/sessionService.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all tests across all files still pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/session/sessionService.ts src/domain/session/sessionService.test.ts
git commit -m "feat: add session service orchestrating plan creation, idempotent events, and result persistence"
```

---

### Task 7: Timestamp-based rest timer (ports legacy Timer.tsx math)

**Files:**
- Create: `src/domain/session/restTimer.ts`
- Create: `src/domain/session/restTimer.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure, framework-independent — no React; a later UI-phase plan wraps this in a component/hook)
- Produces: `remainingRestMs(restEndsAt, now?): number`, `isRestComplete(restEndsAt, now?): boolean` — consumed by the later UI-phase plan's rest-timer component

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/session/restTimer.test.ts
import { describe, expect, it } from 'vitest'
import { isRestComplete, remainingRestMs } from './restTimer'

describe('remainingRestMs', () => {
  it('returns the exact remaining milliseconds before restEndsAt', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:01:30.000Z').getTime()
    expect(remainingRestMs(restEndsAt, now)).toBe(30000)
  })

  it('never returns a negative value once restEndsAt has passed', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:05:00.000Z').getTime()
    expect(remainingRestMs(restEndsAt, now)).toBe(0)
  })

  it('is computed from the fixed restEndsAt timestamp, not a decrementing counter — repeated calls with an advancing clock produce consistent absolute results', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const tick1 = remainingRestMs(restEndsAt, () => new Date('2026-09-13T00:01:00.000Z').getTime())
    const tick2 = remainingRestMs(restEndsAt, () => new Date('2026-09-13T00:01:50.000Z').getTime())
    expect(tick1 - tick2).toBe(50000)
  })
})

describe('isRestComplete', () => {
  it('is false while time remains', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:01:00.000Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(false)
  })

  it('is true once restEndsAt has passed', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:02:00.001Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(true)
  })

  it('is true exactly at restEndsAt', () => {
    const restEndsAt = '2026-09-13T00:02:00.000Z'
    const now = () => new Date('2026-09-13T00:02:00.000Z').getTime()
    expect(isRestComplete(restEndsAt, now)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/session/restTimer.test.ts`
Expected: FAIL — `Cannot find module './restTimer'`.

- [ ] **Step 3: Implement `src/domain/session/restTimer.ts`**

```ts
export function remainingRestMs(restEndsAt: string, now: () => number = Date.now): number {
  return Math.max(0, new Date(restEndsAt).getTime() - now())
}

export function isRestComplete(restEndsAt: string, now: () => number = Date.now): boolean {
  return remainingRestMs(restEndsAt, now) <= 0
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/session/restTimer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/session/restTimer.ts src/domain/session/restTimer.test.ts
git commit -m "feat: add timestamp-derived rest timer math ported from legacy Timer component"
```

---

### Task 8: Adaptation engine seam (placeholder rules, real reason-code architecture)

**Files:**
- Create: `src/domain/adaptation/types.ts`
- Create: `src/domain/adaptation/engine.ts`
- Create: `src/domain/adaptation/engine.test.ts`

**Interfaces:**
- Consumes: `ReasonCode`, `AdaptationDecision` from Task 3; `WorkoutTemplate` from Task 2
- Produces: `CheckInInput`, `AdaptationRule` types; `adaptTemplate(template, checkIn, rules?): AdaptationDecision[]`, `PLACEHOLDER_RULES` — consumed by the later UI-phase plan's Session Preview screen once real rule data lands (see `support/CLAUDE_REQUESTS.md` REQ-20260913-002)

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/adaptation/engine.test.ts
import { describe, expect, it } from 'vitest'
import { adaptTemplate, PLACEHOLDER_RULES } from './engine'
import type { WorkoutTemplate } from '../content/types'

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'ex1',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
    {
      exerciseId: 'ex2',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 12, restSeconds: 45 },
      order: 1,
      optional: true,
    },
  ],
}

describe('adaptTemplate', () => {
  it('produces exactly one decision per template exercise', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    expect(decisions).toHaveLength(2)
    expect(decisions.map((d) => d.exerciseId)).toEqual(['ex1', 'ex2'])
  })

  it('every decision carries a machine-readable reason code', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    for (const decision of decisions) {
      expect(decision.reasonCode).toBeTruthy()
      expect(decision.detail).toBeTruthy()
    }
  })

  it('uses the placeholder rule set by default, clearly not real adaptation logic', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    expect(decisions.every((d) => d.reasonCode === 'RETAINED')).toBe(true)
  })

  it('accepts an injected rule set so real rules can be swapped in without changing the engine', () => {
    const customRules = [
      {
        id: 'custom.always-compress',
        appliesWhen: () => true,
        decide: (exerciseId: string) => ({
          exerciseId,
          reasonCode: 'SESSION_COMPRESSED' as const,
          detail: 'custom test rule',
        }),
      },
    ]
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 }, customRules)
    expect(decisions.every((d) => d.reasonCode === 'SESSION_COMPRESSED')).toBe(true)
  })

  it('exports PLACEHOLDER_RULES so callers can see this is not production rule data', () => {
    expect(PLACEHOLDER_RULES.length).toBeGreaterThan(0)
    expect(PLACEHOLDER_RULES[0].id).toContain('placeholder')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/adaptation/engine.test.ts`
Expected: FAIL — `Cannot find module './engine'`.

- [ ] **Step 3: Create `src/domain/adaptation/types.ts`**

```ts
import type { AdaptationDecision } from '../session/types'

export type CheckInInput = {
  energy: number
  comfort: number
  availableMinutes: number
}

export type AdaptationRule = {
  id: string
  appliesWhen: (input: CheckInInput) => boolean
  decide: (exerciseId: string) => AdaptationDecision
}
```

- [ ] **Step 4: Implement `src/domain/adaptation/engine.ts`**

```ts
import type { WorkoutTemplate } from '../content/types'
import type { AdaptationDecision } from '../session/types'
import type { AdaptationRule, CheckInInput } from './types'

// PLACEHOLDER RULE TABLE — not real adaptation logic.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-002.
// This exists only to prove the engine's seam (inject rules, get
// reason-coded decisions back) works before real rule data is promoted
// from the ChatGPT-side R&D reservoir into this repo.
export const PLACEHOLDER_RULES: AdaptationRule[] = [
  {
    id: 'placeholder.retain-all',
    appliesWhen: () => true,
    decide: (exerciseId) => ({
      exerciseId,
      reasonCode: 'RETAINED',
      detail: 'Placeholder rule — no real adaptation logic yet (see REQ-20260913-002)',
    }),
  },
]

export function adaptTemplate(
  template: WorkoutTemplate,
  checkIn: CheckInInput,
  rules: AdaptationRule[] = PLACEHOLDER_RULES
): AdaptationDecision[] {
  return template.exercises.map((exercise) => {
    const rule = rules.find((r) => r.appliesWhen(checkIn)) ?? rules[0]
    return rule.decide(exercise.exerciseId)
  })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/domain/adaptation/engine.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/adaptation
git commit -m "feat: add adaptation engine seam with placeholder rule table"
```

---

### Task 9: Export/import JSON backup round-trip

**Files:**
- Create: `src/infrastructure/exportImport/exportImport.ts`
- Create: `src/infrastructure/exportImport/exportImport.test.ts`

**Interfaces:**
- Consumes: `db` (Dexie instance) from Task 5
- Produces: `ExportBundle` type, `exportAll(): Promise<ExportBundle>`, `importAll(bundle): Promise<void>` — consumed by the later UI-phase plan's Settings screen (§3 "export/import")

- [ ] **Step 1: Write the failing tests**

```ts
// src/infrastructure/exportImport/exportImport.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll } from './exportImport'
import type { SessionPlan } from '../../domain/session/types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

beforeEach(async () => {
  await db.settings.clear()
  await db.checkIns.clear()
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
  await db.familiarity.clear()
  await db.progression.clear()
})

describe('exportAll / importAll', () => {
  it('exports every table with a version and timestamp', async () => {
    await db.sessionPlans.put(plan)
    const bundle = await exportAll()
    expect(bundle.version).toBe(1)
    expect(bundle.exportedAt).toBeTruthy()
    expect(bundle.sessionPlans).toEqual([plan])
  })

  it('round-trips: exporting then importing into a cleared database restores the data', async () => {
    await db.sessionPlans.put(plan)
    await db.familiarity.put({ exerciseId: 'ex1', exposureCount: 3, lastSeenAt: '2026-09-13T00:00:00.000Z' })
    const bundle = await exportAll()

    await db.sessionPlans.clear()
    await db.familiarity.clear()

    await importAll(bundle)

    const restoredPlan = await db.sessionPlans.get(plan.id)
    const restoredFamiliarity = await db.familiarity.get('ex1')
    expect(restoredPlan).toEqual(plan)
    expect(restoredFamiliarity).toEqual({ exerciseId: 'ex1', exposureCount: 3, lastSeenAt: '2026-09-13T00:00:00.000Z' })
  })

  it('rejects an import bundle with an unsupported version', async () => {
    const bundle = await exportAll()
    await expect(importAll({ ...bundle, version: 999 })).rejects.toThrow('999')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/infrastructure/exportImport/exportImport.test.ts`
Expected: FAIL — `Cannot find module './exportImport'`.

- [ ] **Step 3: Implement `src/infrastructure/exportImport/exportImport.ts`**

```ts
import { db } from '../db/schema'
import type { CheckInRecord, FamiliarityRecord, ProgressionRecord, SettingsRecord } from '../db/schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

export type ExportBundle = {
  exportedAt: string
  version: number
  settings: SettingsRecord[]
  checkIns: CheckInRecord[]
  sessionPlans: SessionPlan[]
  sessionEvents: SessionEvent[]
  sessionResults: SessionResult[]
  familiarity: FamiliarityRecord[]
  progression: ProgressionRecord[]
}

export async function exportAll(): Promise<ExportBundle> {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings: await db.settings.toArray(),
    checkIns: await db.checkIns.toArray(),
    sessionPlans: await db.sessionPlans.toArray(),
    sessionEvents: await db.sessionEvents.toArray(),
    sessionResults: await db.sessionResults.toArray(),
    familiarity: await db.familiarity.toArray(),
    progression: await db.progression.toArray(),
  }
}

export async function importAll(bundle: ExportBundle): Promise<void> {
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export bundle version: ${bundle.version}`)
  }
  await db.transaction(
    'rw',
    [db.settings, db.checkIns, db.sessionPlans, db.sessionEvents, db.sessionResults, db.familiarity, db.progression],
    async () => {
      await db.settings.bulkPut(bundle.settings)
      await db.checkIns.bulkPut(bundle.checkIns)
      await db.sessionPlans.bulkPut(bundle.sessionPlans)
      await db.sessionEvents.bulkPut(bundle.sessionEvents)
      await db.sessionResults.bulkPut(bundle.sessionResults)
      await db.familiarity.bulkPut(bundle.familiarity)
      await db.progression.bulkPut(bundle.progression)
    }
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/infrastructure/exportImport/exportImport.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite and verify the build**

Run: `npx vitest run && npm run build`
Expected: every test file across the whole project passes; the build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/exportImport
git commit -m "feat: add export/import JSON backup round-trip"
```

---

## Known architecture limitation for the next plan to address

Task 6's `sessionService.ts` ties events to a well-defined order using a synthesized-timestamp nudge (`nextTimestamp`), because `sessionRepository.getEventsForSession` (Task 5) sorts by the `timestamp` string and same-millisecond writes otherwise tie-break unpredictably by primary key. This works correctly for sequentially-awaited callers (everything in this plan), but does not fully close a race for two *concurrent* calls against the same session — exactly the "double tap" scenario `CLAUDE.md` calls out, which only becomes physically possible once a real UI exists. Before the Workout Player (or anything else that calls `recordEvent`/`startSession` from user-triggered UI events) ships, replace the timestamp-ordering tiebreaker with a real monotonic sequence — a Dexie auto-increment key or an explicit incrementing `sequence` field on `SessionEvent`, used as the sort key instead of (or alongside) `timestamp` — so ordering is atomic at the single write, not reconstructed by reading-then-deciding beforehand.

## Post-plan (explicitly out of scope, follow-up plan required)

Reconciliation steps 9-14 from `SOURCE_OF_TRUTH_V06.md` §15 — Today/check-in/preview flow, the durable Workout Player/rest/pause/adjust/complete UI, Library/Progress/Settings screens, the shared semantic theme engine (Pixel Bloom/Savage Core), and offline/cache/export-import/accessibility hardening — are a separate plan. They need real content (REQ-20260913-001), real adaptation rules (REQ-20260913-002), and real theme tokens (REQ-20260913-003) to be more than placeholder scaffolding; write that plan once those land, or explicitly re-scope it to build against the placeholder fixtures if the human owner decides to proceed UI-first.
