# v0.6 UI Shell & Guided Workout Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the domain/persistence foundation (previous plan, already merged) into an actually usable V1: a real UI — Today, Check-In, Session Preview, Workout Player (with rest/pause), Session Complete, Library, Progress, Settings — running against the existing event-sourced session engine and Dexie persistence, installable as a PWA, with both first-class themes wired through a shared token system. This covers reconciliation steps 9-13 from `SOURCE_OF_TRUTH_V06.md` §15, plus closes two hardening gaps the previous plan's final review deliberately deferred until real UI callers existed.

**Scope decision — explicitly deferred, not invented:** "Adjust Exercise" (skip/substitute/regress an exercise mid-session) is **not** built in this plan. `SOURCE_OF_TRUTH_V06.md` §7 requires the adaptation engine to "never invent a movement or fake equivalence," and real substitution/regression/skip-policy data is still an open gap (`support/CLAUDE_REQUESTS.md` REQ-20260913-002). Building a fake skip mechanism now would be exactly the kind of invented behavior `CLAUDE.md` forbids. The Workout Player's exercise-level interaction for V1 is Pause and Complete Set only, plus an End Workout escape hatch (maps to `SESSION_COMPLETED_SHORTENED`, already in the domain model). "How To" is included (it only needs the `Exercise` record's own authored text fields, already in the schema) — "Adjust" is not.

**Testing approach — different rigor for different layers, on purpose:** `SOURCE_OF_TRUTH_V06.md` §14 states "Highest-risk behavior is domain/persistence/offline behavior, not JSX." Tasks 1-2 (domain/repository logic) keep the same full TDD rigor as every prior task in this project. Tasks 3-11 (screens, routing, theme, PWA wiring) are presentation code with no business logic of their own — per `CLAUDE.md`'s own architecture rule ("React components must not contain adaptation/progression/programming logic"), they call the already-tested domain/application layer and render its results. These tasks are verified by `npm run build` + `tsc` type-checking (which catches prop/import/type mismatches) rather than component unit tests, and the controller does a full manual browser walkthrough after all tasks land — the same verification method already used successfully for this project's screens. This is a deliberate, spec-aligned scope decision, not skipped rigor.

**Architecture:** Adds a `src/application/` layer (already established by the previous plan's final-review fix) for anything orchestrating domain + infrastructure, and a new `src/presentation/` layer for React: `presentation/theme/` (design tokens + React context), `presentation/layout/` (the persistent nav shell), `presentation/screens/` (one file per screen). Screens import from `application/` and `domain/` for logic, `infrastructure/` only for narrow, already-established read patterns (e.g. reading `db.sessionResults` directly for a list view — no new repository abstraction needed for a simple read-only list). Routing is `react-router-dom` in hash mode (`HashRouter`) — this is a static, serverless SPA with no backend to configure URL rewrites on, so hash-based routing avoids needing any web-server configuration to make deep links work under self-hosting.

**Tech Stack:** Adds `react-router-dom` (client-side routing) to the existing Vite + React 19 + TypeScript + Dexie + Zod + Vitest stack. No new test-only dependencies.

**Spec:** `docs/SOURCE_OF_TRUTH_V06.md` (binding authority) and `CLAUDE.md` (implementation contract). Depends on the merged previous plan: `docs/superpowers/plans/2026-09-13-v06-domain-persistence-foundation.md`.

## Global Constraints

- One private user; no account/auth system in V1 (`CLAUDE.md`).
- No backend, no Supabase, no runtime database server in V1 (`CLAUDE.md`).
- Local persistence uses IndexedDB via Dexie (`CLAUDE.md`) — already established, this plan only adds screens on top.
- React components must not contain adaptation/progression/programming logic (`CLAUDE.md`) — screens call `application`/`domain` functions, they don't reimplement them.
- Required navigation is exactly: Today, Library, Progress, Settings (`CLAUDE.md`). Primary flow: `Today -> Check-In -> Session Preview -> Workout Player -> Rest/Adjust/Pause -> Complete -> Progress` (`CLAUDE.md`) — "Adjust" is the one step explicitly deferred per the Scope decision above.
- Rest timers reconstruct from persisted timestamps, not an in-memory decrement counter (`CLAUDE.md`) — the Workout Player's rest view must use `restTimer.ts`'s `remainingRestMs`/`isRestComplete`, already built and tested, not a new decrementing counter.
- Double taps must not duplicate completed-set/session events (`CLAUDE.md`) — every UI action that calls `recordEvent` must generate a fresh `eventId` (`crypto.randomUUID()`) once per user action and pass it through; the existing idempotency guarantee at the domain/repository layer handles the rest.
- Exactly two first-class themes: `pixel-bloom` and `savage-core`. Themes share the same routes, components, domain logic, exercise data, and media — never fork pages/business logic by theme (`SOURCE_OF_TRUTH_V06.md` §11). Motion preference: `full`, `reduced`, `off`, with `prefers-reduced-motion` respected as a fallback (`SOURCE_OF_TRUTH_V06.md` §11).
- Do not invent exercises, substitutions, equipment, progression edges, or safety rules (`CLAUDE.md`) — theme colors and the expanded placeholder content in this plan are explicitly non-final and labeled as such, same discipline as the previous plan's placeholder fixture.
- Prefer the smallest correct diff (`CLAUDE.md`).

---

### Task 1: Persistence hardening — monotonic event ordering, immutability guard on results, in-progress session lookup

**Files:**
- Modify: `src/infrastructure/db/schema.ts`
- Modify: `src/domain/session/types.ts`
- Modify: `src/infrastructure/db/repositories/sessionRepository.ts`
- Modify: `src/infrastructure/db/repositories/sessionRepository.test.ts`
- Modify: `src/application/sessionService.ts`

**Interfaces:**
- Consumes: existing `SessionEvent`/`SessionPlan`/`SessionResult` types and `db`/`sessionRepository` exports from the previous plan
- Produces: `getInProgressSessions(): Promise<SessionPlan[]>` (new) — consumed by Task 4's Today screen; the existing `savePlan`/`appendEvent`/`getEventsForSession`/`saveResult`/`getResult` signatures are unchanged, only their internal ordering/guard behavior changes; `sessionService.ts` loses its `nextTimestamp` workaround (no longer needed) and gains a `getPlan` re-export — consumed by Task 6's Workout Player

This closes the "Known architecture limitation" the previous plan's final review flagged: replacing the timestamp-tiebreak workaround with a real monotonic sequence key before any UI calls these functions from user taps.

- [ ] **Step 1: Update the Dexie schema — `sessionEvents` gets an auto-increment primary key**

Replace the `sessionEvents` line inside the existing `this.version(1).stores({...})` call in `src/infrastructure/db/schema.ts` — every other line in that `stores({...})` call stays exactly as it is:

```ts
      sessionEvents: '++seq, eventId, sessionId, timestamp',
```

(Full context: this replaces the current `sessionEvents: 'eventId, sessionId, timestamp',` line. `eventId` is no longer the primary key — Dexie auto-assigns an incrementing `seq` on insert, which becomes the true insertion-order tiebreaker. `eventId` remains an indexed field, just not the primary key. No other table's schema line changes.)

- [ ] **Step 2: Add the optional `seq` field to the `SessionEvent` type**

In `src/domain/session/types.ts`, change the `SessionEvent` type from:

```ts
export type SessionEvent = {
  eventId: string
  sessionId: string
  type: SessionEventType
  timestamp: string
  payload: Record<string, unknown>
}
```

to:

```ts
export type SessionEvent = {
  // Dexie-assigned auto-increment primary key (src/infrastructure/db/schema.ts).
  // Optional because pure domain code (the reducer, tests) constructs events
  // without one; the persistence layer assigns it on insert and it becomes
  // the true insertion-order tiebreaker for replay, since two events can
  // share the same millisecond `timestamp`.
  seq?: number
  eventId: string
  sessionId: string
  type: SessionEventType
  timestamp: string
  payload: Record<string, unknown>
}
```

Everything else in this file is unchanged.

- [ ] **Step 3: Write the failing tests for the repository changes**

Replace the existing "appends events and retrieves them in timestamp order for a session" test in `src/infrastructure/db/repositories/sessionRepository.test.ts` with one that reflects the new, correct behavior (insertion order, not timestamp-label order — this is the actual bug fix, and the test now locks it in):

```ts
  it('appends events and retrieves them in insertion order for a session, even when timestamps are out of order or identical', async () => {
    const events: SessionEvent[] = [
      { eventId: 'e2', sessionId: plan.id, type: 'SET_COMPLETED', timestamp: '2026-09-13T00:01:00.000Z', payload: {} },
      { eventId: 'e1', sessionId: plan.id, type: 'SESSION_STARTED', timestamp: '2026-09-13T00:00:00.000Z', payload: {} },
    ]
    for (const event of events) {
      await sessionRepo.appendEvent(event)
    }
    const loaded = await sessionRepo.getEventsForSession(plan.id)
    // e2 was inserted first even though its label timestamp is later — insertion
    // order (the Dexie auto-increment `seq`) governs, not the timestamp string.
    expect(loaded.map((e) => e.eventId)).toEqual(['e2', 'e1'])
  })
```

Add two new tests to the same file (in the existing `describe('sessionRepository', ...)` block, alongside the others):

```ts
  it('saveResult succeeds for a session with no existing result', async () => {
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

  it('saveResult throws when a result already exists for the session', async () => {
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
    await expect(sessionRepo.saveResult(result)).rejects.toThrow(plan.id)
  })

  it('getInProgressSessions returns plans with no persisted result, and excludes plans that have one', async () => {
    const otherPlan: SessionPlan = { ...plan, id: 'session-2' }
    await sessionRepo.savePlan(plan)
    await sessionRepo.savePlan(otherPlan)
    await sessionRepo.saveResult({
      sessionId: otherPlan.id,
      planId: otherPlan.id,
      status: 'COMPLETED',
      startedAt: '2026-09-13T00:00:00.000Z',
      endedAt: '2026-09-13T00:10:00.000Z',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    })
    const inProgress = await sessionRepo.getInProgressSessions()
    expect(inProgress.map((p) => p.id)).toEqual([plan.id])
  })
```

(Note: the existing test file already has a `beforeEach` that clears `db.sessionPlans`/`db.sessionEvents`/`db.sessionResults`, and already defines a top-level `plan: SessionPlan` fixture — reuse it, don't redefine it. Also update the existing "saves and retrieves a session plan" test if it currently calls `savePlan(plan)` more than once across different `it` blocks sharing the same `plan.id` without the `beforeEach` clearing between them — it shouldn't, since `beforeEach` already clears the tables, but double check no two tests in the file call `savePlan` with the *same* id in the *same* test body more than once now that it's guarded.)

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run src/infrastructure/db/repositories/sessionRepository.test.ts`
Expected: FAIL — the rewritten ordering test fails against the current timestamp-sort implementation (wrong order), and `getInProgressSessions` doesn't exist yet.

- [ ] **Step 5: Implement the repository changes**

Replace the full contents of `src/infrastructure/db/repositories/sessionRepository.ts` with:

```ts
import { db } from '../schema'
import type { SessionEvent, SessionPlan, SessionResult } from '../../../domain/session/types'

export async function savePlan(plan: SessionPlan): Promise<void> {
  const existing = await db.sessionPlans.get(plan.id)
  if (existing) {
    throw new Error(
      `Session plan ${plan.id} already exists — SessionPlans are immutable snapshots and cannot be overwritten`
    )
  }
  await db.sessionPlans.put(plan)
}

export async function getPlan(id: string): Promise<SessionPlan | undefined> {
  return db.sessionPlans.get(id)
}

export async function appendEvent(event: SessionEvent): Promise<void> {
  const existing = await db.sessionEvents.where('eventId').equals(event.eventId).first()
  if (existing) {
    return
  }
  await db.sessionEvents.add(event)
}

export async function getEventsForSession(sessionId: string): Promise<SessionEvent[]> {
  return db.sessionEvents.where('sessionId').equals(sessionId).sortBy('seq')
}

export async function saveResult(result: SessionResult): Promise<void> {
  const existing = await db.sessionResults.get(result.sessionId)
  if (existing) {
    throw new Error(
      `Session result for ${result.sessionId} already exists — SessionResults are immutable once recorded`
    )
  }
  await db.sessionResults.put(result)
}

export async function getResult(sessionId: string): Promise<SessionResult | undefined> {
  return db.sessionResults.get(sessionId)
}

export async function getInProgressSessions(): Promise<SessionPlan[]> {
  const [plans, results] = await Promise.all([db.sessionPlans.toArray(), db.sessionResults.toArray()])
  const completedIds = new Set(results.map((r) => r.sessionId))
  return plans.filter((p) => !completedIds.has(p.id))
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/infrastructure/db/repositories/sessionRepository.test.ts`
Expected: PASS (8 tests: the 5 pre-existing ones plus the 3 new/rewritten ones from Step 3).

- [ ] **Step 7: Simplify `sessionService.ts` — remove the now-unnecessary timestamp workaround, add a `getPlan` re-export**

Replace the full contents of `src/application/sessionService.ts` with:

```ts
import { replayEvents } from '../domain/session/sessionMachine'
import type { SessionEvent, SessionEventType, SessionPlan, SessionResult, SessionState } from '../domain/session/types'
import * as sessionRepo from '../infrastructure/db/repositories/sessionRepository'

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

export async function getPlan(sessionId: string): Promise<SessionPlan | undefined> {
  return sessionRepo.getPlan(sessionId)
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
  try {
    await sessionRepo.saveResult(result)
  } catch {
    // Another call already persisted the result between our getResult
    // check and this write (e.g. a retried/duplicate recordEvent call
    // racing itself). saveResult's own guard rejected the second write —
    // that's fine, the result is already correctly persisted once.
  }
}
```

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass, including `src/application/sessionService.test.ts` (unchanged file, but now exercising the new ordering/guard logic underneath it — this is the integration check that the simplification didn't break anything).

- [ ] **Step 9: Verify the build**

Run: `npm run build`
Expected: succeeds — confirms the `seq?: number` type addition and the `getPlan` export don't break type-checking anywhere.

- [ ] **Step 10: Commit**

```bash
git add src/infrastructure/db/schema.ts src/domain/session/types.ts src/infrastructure/db/repositories/sessionRepository.ts src/infrastructure/db/repositories/sessionRepository.test.ts src/application/sessionService.ts
git commit -m "feat: replace timestamp-tiebreak with monotonic event ordering, guard SessionResult immutability, add in-progress session lookup"
```

---

### Task 2: `createSessionPlanFromTemplate` factory + expanded placeholder content

**Files:**
- Create: `src/domain/session/createSessionPlan.ts`
- Create: `src/domain/session/createSessionPlan.test.ts`
- Modify: `src/domain/content/fixtures/placeholderPack.ts`

**Interfaces:**
- Consumes: `WorkoutTemplate` from `domain/content/types` (previous plan), `adaptTemplate`/`PLACEHOLDER_RULES` from `domain/adaptation/engine`, `CheckInInput`/`AdaptationRule` from `domain/adaptation/types`, `computeReproducibilityHash` from `domain/session/reproducibilityHash`, `SessionPlan`/`SessionPlanExercise` from `domain/session/types` — all previous-plan exports, unchanged
- Produces: `createSessionPlanFromTemplate(params): SessionPlan` — consumed by Task 5's Check-In screen; an expanded `placeholderTemplate` (now 2 exercises instead of 1) — consumed by Tasks 4, 5, 8

This closes the "nothing wires content → adaptation → SessionPlan" gap the previous plan's final review flagged — this is the first real caller of `computeReproducibilityHash` and `adaptTemplate` outside their own unit tests.

- [ ] **Step 1: Write the failing tests**

```ts
// src/domain/session/createSessionPlan.test.ts
import { describe, expect, it } from 'vitest'
import { createSessionPlanFromTemplate } from './createSessionPlan'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { WorkoutTemplate } from '../content/types'

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    { exerciseId: 'ex1', exerciseVersion: 1, prescription: { sets: 3, reps: 10, restSeconds: 60 }, order: 0, optional: false },
    { exerciseId: 'ex2', exerciseVersion: 1, prescription: { sets: 2, reps: 12, restSeconds: 45 }, order: 1, optional: true },
  ],
}

const checkIn = { energy: 3, comfort: 3, availableMinutes: 30 }

describe('createSessionPlanFromTemplate', () => {
  it('maps template exercises into session-plan exercises with matching prescriptions', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-1',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.id).toBe('session-1')
    expect(plan.templateId).toBe('placeholder.test-template')
    expect(plan.templateVersion).toBe(1)
    expect(plan.packId).toBe('placeholder-pack')
    expect(plan.exercises).toHaveLength(2)
    expect(plan.exercises[0]).toEqual({
      exerciseId: 'ex1',
      exerciseVersion: 1,
      sets: 3,
      reps: 10,
      timeSeconds: undefined,
      restSeconds: 60,
      order: 0,
    })
  })

  it('includes one adaptation decision per exercise, from the default placeholder rules', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-2',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.adaptations).toHaveLength(2)
    expect(plan.adaptations.map((a) => a.exerciseId)).toEqual(['ex1', 'ex2'])
  })

  it('computes a reproducibility hash matching computeReproducibilityHash over the same fields', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-3',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    const expected = computeReproducibilityHash({
      id: plan.id,
      templateId: plan.templateId,
      templateVersion: plan.templateVersion,
      packId: plan.packId,
      ruleVersion: plan.ruleVersion,
      createdAt: plan.createdAt,
      exercises: plan.exercises,
      adaptations: plan.adaptations,
    })
    expect(plan.reproducibilityHash).toBe(expected)
  })

  it('is deterministic for identical inputs', () => {
    const params = {
      id: 'session-4',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      checkIn,
      ruleVersion: 'placeholder-v0',
    }
    expect(createSessionPlanFromTemplate(params)).toEqual(createSessionPlanFromTemplate(params))
  })

  it('accepts an injected rule set, passed straight through to adaptTemplate', () => {
    const customRules = [
      {
        id: 'test.always-compress',
        appliesWhen: () => true,
        decide: (exerciseId: string) => ({ exerciseId, reasonCode: 'SESSION_COMPRESSED' as const, detail: 'test' }),
      },
    ]
    const plan = createSessionPlanFromTemplate({
      id: 'session-5',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      checkIn,
      ruleVersion: 'placeholder-v0',
      rules: customRules,
    })
    expect(plan.adaptations.every((a) => a.reasonCode === 'SESSION_COMPRESSED')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/session/createSessionPlan.test.ts`
Expected: FAIL — `Cannot find module './createSessionPlan'`.

- [ ] **Step 3: Implement `src/domain/session/createSessionPlan.ts`**

```ts
import type { WorkoutTemplate } from '../content/types'
import { adaptTemplate } from '../adaptation/engine'
import type { AdaptationRule, CheckInInput } from '../adaptation/types'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { SessionPlan, SessionPlanExercise } from './types'

export type CreateSessionPlanParams = {
  id: string
  createdAt: string
  template: WorkoutTemplate
  checkIn: CheckInInput
  ruleVersion: string
  rules?: AdaptationRule[]
}

export function createSessionPlanFromTemplate(params: CreateSessionPlanParams): SessionPlan {
  const { id, createdAt, template, checkIn, ruleVersion, rules } = params
  const adaptations = adaptTemplate(template, checkIn, rules)
  const exercises: SessionPlanExercise[] = template.exercises.map((templateExercise) => ({
    exerciseId: templateExercise.exerciseId,
    exerciseVersion: templateExercise.exerciseVersion,
    sets: templateExercise.prescription.sets,
    reps: templateExercise.prescription.reps,
    timeSeconds: templateExercise.prescription.timeSeconds,
    restSeconds: templateExercise.prescription.restSeconds,
    order: templateExercise.order,
  }))

  const base = {
    id,
    templateId: template.id,
    templateVersion: template.version,
    packId: template.packId,
    ruleVersion,
    createdAt,
    exercises,
    adaptations,
  }

  return { ...base, reproducibilityHash: computeReproducibilityHash(base) }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/session/createSessionPlan.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Expand the placeholder content fixture to 2 exercises, so the Workout Player has a real multi-exercise flow to demonstrate**

Replace the full contents of `src/domain/content/fixtures/placeholderPack.ts` with:

```ts
//
// PLACEHOLDER CONTENT — not real product data.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-001.
// Exists only so the schema-validation and domain layers — and now the
// UI screens built on top of them — have something concrete to
// validate/exercise against before real exercise/workout content is
// promoted from the ChatGPT-side R&D reservoir into this repo.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'

export const placeholderExerciseA: Exercise = {
  id: 'placeholder.exercise-a',
  version: 1,
  name: 'Placeholder Exercise A',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase 1', 'Placeholder phase 2'],
  cues: ['Placeholder cue'],
  commonErrors: ['Placeholder common error'],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

export const placeholderExerciseB: Exercise = {
  id: 'placeholder.exercise-b',
  version: 1,
  name: 'Placeholder Exercise B',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase 1'],
  cues: ['Placeholder cue'],
  commonErrors: [],
  prescriptionCapabilities: { reps: false, time: true, hold: false },
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
      exerciseId: 'placeholder.exercise-a',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
    {
      exerciseId: 'placeholder.exercise-b',
      exerciseVersion: 1,
      prescription: { sets: 2, timeSeconds: 30, restSeconds: 45 },
      order: 1,
      optional: false,
    },
  ],
}

export const placeholderPack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.exercise-a', 'placeholder.exercise-b'],
  templateIds: ['placeholder.test-template'],
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass. `src/domain/content/schema.test.ts` is unaffected (it uses its own local literals, not this fixture). No other file currently imports `placeholderTemplate`/`placeholderPack`, so nothing else needs updating.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/domain/session/createSessionPlan.ts src/domain/session/createSessionPlan.test.ts src/domain/content/fixtures/placeholderPack.ts
git commit -m "feat: wire content+adaptation into SessionPlan creation, expand placeholder content to a 2-exercise template"
```

---

### Task 3: Theme token system, motion preference, router, and app shell

**Files:**
- Create: `src/presentation/theme/tokens.ts`
- Create: `src/presentation/theme/ThemeContext.tsx`
- Create: `src/presentation/layout/AppShell.tsx`
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`
- Modify: `src/App.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getSetting`/`setSetting` from `infrastructure/db/repositories/settingsRepository` (previous plan)
- Produces: `ThemeName`, `MotionPreference`, `ThemeTokens`, `THEME_TOKENS`, `applyThemeTokens`, `applyMotionPreference` from `tokens.ts`; `ThemeProvider`, `useTheme()` from `ThemeContext.tsx`; `AppShell` (the persistent nav shell wrapping Today/Library/Progress/Settings via an `<Outlet />`) — consumed by every screen task that follows

- [ ] **Step 1: Add `react-router-dom` to `package.json`**

In the `"dependencies"` object, add (alongside the existing `react`, `react-dom`, `dexie`, `zod` entries):

```json
    "react-router-dom": "6.28.1",
```

- [ ] **Step 2: Install it**

Run: `npm install`
Expected: succeeds, `package-lock.json` updates.

- [ ] **Step 3: Create `src/presentation/theme/tokens.ts`**

```ts
export type ThemeName = 'pixel-bloom' | 'savage-core'
export type MotionPreference = 'full' | 'reduced' | 'off'

export type ThemeTokens = {
  colorBackground: string
  colorSurface: string
  colorPrimary: string
  colorAccent: string
  colorText: string
  colorTextMuted: string
  colorBorder: string
  radiusPanel: string
}

// PLACEHOLDER TOKEN VALUES — see support/CLAUDE_REQUESTS.md REQ-20260913-003.
// Not final product visual design. Exists so the theme-switching
// architecture (shared component tree, semantic tokens, no per-theme
// forking) can be built and verified before real design tokens land.
export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  'pixel-bloom': {
    colorBackground: '#fdf2f8',
    colorSurface: '#ffffff',
    colorPrimary: '#ec4899',
    colorAccent: '#8b5cf6',
    colorText: '#3f2a44',
    colorTextMuted: '#8b7a92',
    colorBorder: '#f3d9ea',
    radiusPanel: '16px',
  },
  'savage-core': {
    colorBackground: '#0a0a0c',
    colorSurface: '#18181b',
    colorPrimary: '#22d3ee',
    colorAccent: '#f43f5e',
    colorText: '#f4f4f5',
    colorTextMuted: '#8a8a92',
    colorBorder: '#2a2a2f',
    radiusPanel: '4px',
  },
}

const TOKEN_CSS_VAR: Record<keyof ThemeTokens, string> = {
  colorBackground: '--color-background',
  colorSurface: '--color-surface',
  colorPrimary: '--color-primary',
  colorAccent: '--color-accent',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorBorder: '--color-border',
  radiusPanel: '--radius-panel',
}

export function applyThemeTokens(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme]
  const root = document.documentElement
  root.dataset.theme = theme
  for (const key of Object.keys(tokens) as (keyof ThemeTokens)[]) {
    root.style.setProperty(TOKEN_CSS_VAR[key], tokens[key])
  }
}

export function applyMotionPreference(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion
}
```

- [ ] **Step 4: Create `src/presentation/theme/ThemeContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyMotionPreference, applyThemeTokens, type MotionPreference, type ThemeName } from './tokens'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  motion: MotionPreference
  setMotion: (motion: MotionPreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('pixel-bloom')
  const [motion, setMotionState] = useState<MotionPreference>('full')

  useEffect(() => {
    let cancelled = false
    async function loadPreferences() {
      const [storedTheme, storedMotion] = await Promise.all([
        getSetting<ThemeName>('theme'),
        getSetting<MotionPreference>('motion'),
      ])
      if (cancelled) return
      if (storedTheme) setThemeState(storedTheme)
      if (storedMotion) setMotionState(storedMotion)
    }
    void loadPreferences()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    applyThemeTokens(theme)
  }, [theme])

  useEffect(() => {
    applyMotionPreference(motion)
  }, [motion])

  function setTheme(next: ThemeName) {
    setThemeState(next)
    void setSetting('theme', next)
  }

  function setMotion(next: MotionPreference) {
    setMotionState(next)
    void setSetting('motion', next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme, motion, setMotion }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
```

- [ ] **Step 5: Update `tailwind.config.ts` to expose the theme tokens as Tailwind utility colors**

Replace the full contents of `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-background)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        ink: 'var(--color-text)',
        'ink-muted': 'var(--color-text-muted)',
        edge: 'var(--color-border)',
      },
      borderRadius: {
        panel: 'var(--radius-panel)',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Update `src/index.css`** with base token values (so there's no flash of unstyled content before `ThemeProvider`'s first effect runs) and motion-preference CSS

Replace the full contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-background: #fdf2f8;
  --color-surface: #ffffff;
  --color-primary: #ec4899;
  --color-accent: #8b5cf6;
  --color-text: #3f2a44;
  --color-text-muted: #8b7a92;
  --color-border: #f3d9ea;
  --radius-panel: 16px;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
}

/* Explicit reduced/off always wins. */
[data-motion='reduced'] *,
[data-motion='off'] * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* 'full' means "no explicit app-level override" — still respect the OS
   accessibility setting as the fallback SOURCE_OF_TRUTH_V06.md §11 requires. */
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Create `src/presentation/layout/AppShell.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-edge bg-surface">
        <NavItem to="/" label="Today" end />
        <NavItem to="/library" label="Library" />
        <NavItem to="/progress" label="Progress" />
        <NavItem to="/settings" label="Settings" />
      </nav>
    </div>
  )
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex-1 py-3 text-center text-sm ${isActive ? 'text-primary font-semibold' : 'text-ink-muted'}`}
    >
      {label}
    </NavLink>
  )
}
```

- [ ] **Step 8: Replace `src/App.tsx`** with the router + theme wiring (screens referenced here are created in Tasks 4-10 — this step makes the file reference them; the build won't succeed until those exist, which is fine, the next tasks create them immediately after)

```tsx
import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './presentation/theme/ThemeContext'
import { AppShell } from './presentation/layout/AppShell'
import { TodayScreen } from './presentation/screens/TodayScreen'
import { CheckInScreen } from './presentation/screens/CheckInScreen'
import { SessionPreviewScreen } from './presentation/screens/SessionPreviewScreen'
import { WorkoutPlayerScreen } from './presentation/screens/WorkoutPlayerScreen'
import { SessionCompleteScreen } from './presentation/screens/SessionCompleteScreen'
import { LibraryScreen } from './presentation/screens/LibraryScreen'
import { ProgressScreen } from './presentation/screens/ProgressScreen'
import { SettingsScreen } from './presentation/screens/SettingsScreen'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>
          <Route path="/checkin/:templateId" element={<CheckInScreen />} />
          <Route path="/preview" element={<SessionPreviewScreen />} />
          <Route path="/session/:sessionId" element={<WorkoutPlayerScreen />} />
          <Route path="/session/:sessionId/complete" element={<SessionCompleteScreen />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
```

Note: `AppShell` wraps only the 4 persistent-nav screens. Check-In, Session Preview, Workout Player, and Session Complete render full-screen without the bottom nav — matching `SOURCE_OF_TRUTH_V06.md` §3's "Persistent navigation **outside** an active workout."

- [ ] **Step 9: Commit** (build will fail until Tasks 4-10 create the screen files this imports — that's expected and resolved by the immediately-following tasks; do not attempt to verify the build after this step)

```bash
git add package.json package-lock.json src/presentation/theme src/presentation/layout/AppShell.tsx src/index.css tailwind.config.ts src/App.tsx
git commit -m "feat: add theme token system, motion preference, router, and app shell"
```

---

### Task 4: Today screen

**Files:**
- Create: `src/presentation/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: `getInProgressSessions` from Task 1; `placeholderPack`/`placeholderTemplate` from Task 2
- Produces: `TodayScreen` — consumed by `App.tsx` (already wired in Task 3)

- [ ] **Step 1: Create `src/presentation/screens/TodayScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { placeholderPack, placeholderTemplate } from '../../domain/content/fixtures/placeholderPack'
import { getInProgressSessions } from '../../infrastructure/db/repositories/sessionRepository'
import type { SessionPlan } from '../../domain/session/types'

export function TodayScreen() {
  const [inProgress, setInProgress] = useState<SessionPlan[] | null>(null)

  useEffect(() => {
    getInProgressSessions().then(setInProgress)
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Today</h1>

      {inProgress === null && <p className="text-ink-muted">Loading…</p>}

      {inProgress && inProgress.length > 0 && (
        <Link to={`/session/${inProgress[0].id}`} className="block rounded-panel border border-edge bg-surface p-4">
          <p className="font-semibold text-primary">Resume Workout</p>
          <p className="text-sm text-ink-muted">In progress</p>
        </Link>
      )}

      <div className="rounded-panel border border-edge bg-surface p-4 space-y-2">
        <p className="font-semibold">{placeholderTemplate.name}</p>
        <p className="text-sm text-ink-muted">
          {placeholderPack.name} — {placeholderTemplate.exercises.length} exercises
        </p>
        <Link to={`/checkin/${placeholderTemplate.id}`} className="inline-block rounded-panel bg-primary px-4 py-2 text-white">
          Start check-in
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles this file without error** (full build isn't expected to succeed yet — other screens this depends on via `App.tsx` don't exist until later tasks)

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep TodayScreen || echo "no TodayScreen-specific errors"`
Expected: no errors specific to `TodayScreen.tsx` (errors about *other* still-missing screen files are expected and fine at this point).

- [ ] **Step 3: Commit**

```bash
git add src/presentation/screens/TodayScreen.tsx
git commit -m "feat: add Today screen"
```

---

### Task 5: Check-In and Session Preview screens

**Files:**
- Create: `src/presentation/screens/CheckInScreen.tsx`
- Create: `src/presentation/screens/SessionPreviewScreen.tsx`

**Interfaces:**
- Consumes: `createSessionPlanFromTemplate` from Task 2; `placeholderTemplate` from Task 2; `startSession` from `application/sessionService` (Task 1's re-simplified version)
- Produces: `CheckInScreen`, `SessionPreviewScreen` — consumed by `App.tsx` (already wired)

- [ ] **Step 1: Create `src/presentation/screens/CheckInScreen.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { placeholderTemplate } from '../../domain/content/fixtures/placeholderPack'
import { createSessionPlanFromTemplate } from '../../domain/session/createSessionPlan'

export function CheckInScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [energy, setEnergy] = useState(3)
  const [comfort, setComfort] = useState(3)
  const [availableMinutes, setAvailableMinutes] = useState(30)

  function handleContinue() {
    if (templateId !== placeholderTemplate.id) {
      return
    }
    const plan = createSessionPlanFromTemplate({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      template: placeholderTemplate,
      checkIn: { energy, comfort, availableMinutes },
      ruleVersion: 'placeholder-v0',
    })
    navigate('/preview', { state: { plan } })
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Check-In</h1>
      <RangeField label="Energy" value={energy} onChange={setEnergy} />
      <RangeField label="Comfort" value={comfort} onChange={setComfort} />
      <RangeField label="Available minutes" value={availableMinutes} onChange={setAvailableMinutes} min={5} max={90} step={5} />
      <button className="rounded-panel bg-primary px-4 py-2 text-white" onClick={handleContinue}>
        Continue
      </button>
    </div>
  )
}

function RangeField({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-ink-muted">
        {label}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  )
}
```

- [ ] **Step 2: Create `src/presentation/screens/SessionPreviewScreen.tsx`**

```tsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { startSession } from '../../application/sessionService'
import type { SessionPlan } from '../../domain/session/types'

export function SessionPreviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const plan = (location.state as { plan?: SessionPlan } | null)?.plan
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!plan) {
    return (
      <div className="p-4 space-y-2">
        <p>No session plan to preview.</p>
        <button className="underline" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    )
  }

  async function handleStart() {
    if (!plan) return
    setStarting(true)
    setError(null)
    try {
      await startSession(plan)
      navigate(`/session/${plan.id}`)
    } catch {
      setError('Could not start the workout — please try again.')
      setStarting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Session Preview</h1>
      <ul className="space-y-2">
        {plan.exercises.map((exercise) => {
          const adaptation = plan.adaptations.find((a) => a.exerciseId === exercise.exerciseId)
          return (
            <li key={exercise.exerciseId} className="rounded-panel border border-edge bg-surface p-3">
              <p className="font-semibold">{exercise.exerciseId}</p>
              <p className="text-sm text-ink-muted">
                {exercise.sets} sets × {exercise.reps ? `${exercise.reps} reps` : `${exercise.timeSeconds}s`} — rest{' '}
                {exercise.restSeconds}s
              </p>
              {adaptation && (
                <p className="text-xs text-accent">
                  {adaptation.reasonCode}: {adaptation.detail}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        className="rounded-panel bg-primary px-4 py-2 text-white disabled:opacity-50"
        disabled={starting}
        onClick={handleStart}
      >
        Start Workout
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/presentation/screens/CheckInScreen.tsx src/presentation/screens/SessionPreviewScreen.tsx
git commit -m "feat: add Check-In and Session Preview screens"
```

---

### Task 6: Workout Player screen (active set, rest, pause)

**Files:**
- Create: `src/presentation/screens/WorkoutPlayerScreen.tsx`

**Interfaces:**
- Consumes: `getPlan`, `getCurrentState`, `recordEvent` from `application/sessionService` (Task 1); `remainingRestMs`, `isRestComplete` from `domain/session/restTimer` (previous plan, unchanged)
- Produces: `WorkoutPlayerScreen` — consumed by `App.tsx` (already wired)

This is the core screen: one exercise per view, the rest timer, pause/resume, and the "End workout" escape hatch (maps to `SESSION_COMPLETED_SHORTENED`). Per this plan's Scope decision, there is no "Adjust Exercise" — only Complete Set and Pause.

- [ ] **Step 1: Create `src/presentation/screens/WorkoutPlayerScreen.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCurrentState, getPlan, recordEvent } from '../../application/sessionService'
import type { SessionPlan, SessionState } from '../../domain/session/types'
import { isRestComplete, remainingRestMs } from '../../domain/session/restTimer'

type ActionType = 'SET_COMPLETED' | 'REST_ENDED' | 'REST_SKIPPED' | 'PAUSED' | 'RESUMED'

export function WorkoutPlayerScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [state, setState] = useState<SessionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const [loadedPlan, loadedState] = await Promise.all([getPlan(sessionId), getCurrentState(sessionId)])
    setPlan(loadedPlan ?? null)
    setState(loadedState)
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!sessionId) return
    if (state?.status === 'COMPLETED' || state?.status === 'COMPLETED_SHORTENED') {
      navigate(`/session/${sessionId}/complete`, { replace: true })
    }
  }, [state, sessionId, navigate])

  async function handleAction(type: ActionType) {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const next = await recordEvent(sessionId, type, crypto.randomUUID())
      setState(next)
    } catch {
      setError('Could not save — check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEndWorkout() {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      await recordEvent(sessionId, 'SESSION_COMPLETED_SHORTENED', crypto.randomUUID())
      navigate('/')
    } catch {
      setError('Could not end the workout — please try again.')
      setBusy(false)
    }
  }

  if (!plan || !state) {
    return <div className="p-4">Loading…</div>
  }

  if (state.status === 'PAUSED') {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-lg">Paused</p>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button className="rounded-panel bg-primary px-4 py-2 text-white" disabled={busy} onClick={() => handleAction('RESUMED')}>
          Resume
        </button>
      </div>
    )
  }

  if (state.status === 'RESTING' && state.restEndsAt) {
    return (
      <RestingView
        restEndsAt={state.restEndsAt}
        busy={busy}
        error={error}
        onRestComplete={() => handleAction('REST_ENDED')}
        onSkip={() => handleAction('REST_SKIPPED')}
        onPause={() => handleAction('PAUSED')}
      />
    )
  }

  const exercise = plan.exercises[state.currentExerciseIndex]
  if (!exercise) {
    return <div className="p-4">Loading…</div>
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-ink-muted">
        Exercise {state.currentExerciseIndex + 1} of {plan.exercises.length}
      </p>
      <h2 className="text-2xl font-bold">{exercise.exerciseId}</h2>
      <p>
        Set {state.currentSetNumber} of {exercise.sets}
        {exercise.reps ? ` — ${exercise.reps} reps` : exercise.timeSeconds ? ` — ${exercise.timeSeconds}s` : ''}
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex gap-2">
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={() => handleAction('PAUSED')}>
          Pause
        </button>
        <button className="rounded-panel bg-primary px-4 py-2 text-white" disabled={busy} onClick={() => handleAction('SET_COMPLETED')}>
          Complete Set
        </button>
      </div>
      <button className="text-sm text-ink-muted underline" disabled={busy} onClick={handleEndWorkout}>
        End workout
      </button>
    </div>
  )
}

function RestingView({
  restEndsAt,
  busy,
  error,
  onRestComplete,
  onSkip,
  onPause,
}: {
  restEndsAt: string
  busy: boolean
  error: string | null
  onRestComplete: () => void
  onSkip: () => void
  onPause: () => void
}) {
  const [remainingMs, setRemainingMs] = useState(() => remainingRestMs(restEndsAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(remainingRestMs(restEndsAt))
      if (isRestComplete(restEndsAt)) {
        clearInterval(interval)
        onRestComplete()
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt])

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="p-6 text-center space-y-6">
      <p className="text-lg">Rest</p>
      <p className="text-6xl font-bold tabular-nums" role="timer">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      {error && <p className="text-sm text-accent">{error}</p>}
      <div className="flex justify-center gap-2">
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onPause}>
          Pause
        </button>
        <button className="rounded-panel border border-edge px-4 py-2" disabled={busy} onClick={onSkip}>
          Skip rest
        </button>
      </div>
    </div>
  )
}
```

(The `eslint-disable-next-line` comment is precautionary — this project has no ESLint configured, so it's inert; the effect deliberately excludes `onRestComplete` from its dependency array since that callback's identity changes every render and including it would restart the interval on every tick.)

- [ ] **Step 2: Commit**

```bash
git add src/presentation/screens/WorkoutPlayerScreen.tsx
git commit -m "feat: add Workout Player screen with active-set, resting, and paused views"
```

---

### Task 7: Session Complete screen and route wiring

**Files:**
- Create: `src/presentation/screens/SessionCompleteScreen.tsx`

**Interfaces:**
- Consumes: `getResult` from `infrastructure/db/repositories/sessionRepository` (previous plan, unchanged)
- Produces: `SessionCompleteScreen` — consumed by `App.tsx` (already wired)

- [ ] **Step 1: Create `src/presentation/screens/SessionCompleteScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getResult } from '../../infrastructure/db/repositories/sessionRepository'
import type { SessionResult } from '../../domain/session/types'

export function SessionCompleteScreen() {
  const { sessionId } = useParams()
  const [result, setResult] = useState<SessionResult | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getResult(sessionId).then((loaded) => setResult(loaded ?? null))
  }, [sessionId])

  return (
    <div className="p-6 text-center space-y-4">
      <p className="text-xl font-semibold">Workout complete</p>
      {result && (
        <p className="text-ink-muted">
          {result.totalSetsCompleted} of {result.totalSetsPlanned} sets completed
          {result.status === 'COMPLETED_SHORTENED' ? ' (ended early)' : ''}
        </p>
      )}
      <Link to="/" className="inline-block rounded-panel bg-primary px-4 py-2 text-white">
        Back to Today
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify the full build now succeeds** — this is the first point in this plan where every file `App.tsx` (Task 3) imports actually exists

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (this task and the two before it added no new test files, but confirms nothing broke).

- [ ] **Step 4: Commit**

```bash
git add src/presentation/screens/SessionCompleteScreen.tsx
git commit -m "feat: add Session Complete screen"
```

---

### Task 8: Library screen

**Files:**
- Create: `src/presentation/screens/LibraryScreen.tsx`

**Interfaces:**
- Consumes: `placeholderPack`, `placeholderTemplate` from Task 2
- Produces: `LibraryScreen` — consumed by `App.tsx` (already wired)

- [ ] **Step 1: Create `src/presentation/screens/LibraryScreen.tsx`**

```tsx
import { placeholderPack, placeholderTemplate } from '../../domain/content/fixtures/placeholderPack'

export function LibraryScreen() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Library</h1>
      <div className="rounded-panel border border-edge bg-surface p-4">
        <p className="font-semibold">{placeholderPack.name}</p>
        <ul className="mt-2 list-inside list-disc text-sm text-ink-muted">
          <li>
            {placeholderTemplate.name} — {placeholderTemplate.exercises.length} exercises
          </li>
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/screens/LibraryScreen.tsx
git commit -m "feat: add Library screen"
```

---

### Task 9: Progress screen

**Files:**
- Create: `src/presentation/screens/ProgressScreen.tsx`

**Interfaces:**
- Consumes: `db` from `infrastructure/db/schema` (previous plan, unchanged) — a direct read of `sessionResults` for a simple list view; no new repository abstraction needed for this
- Produces: `ProgressScreen` — consumed by `App.tsx` (already wired)

- [ ] **Step 1: Create `src/presentation/screens/ProgressScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { db } from '../../infrastructure/db/schema'
import type { SessionResult } from '../../domain/session/types'

export function ProgressScreen() {
  const [results, setResults] = useState<SessionResult[] | null>(null)

  useEffect(() => {
    db.sessionResults.toArray().then((all) => setResults([...all].sort((a, b) => b.endedAt.localeCompare(a.endedAt))))
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>
      {results === null && <p className="text-ink-muted">Loading…</p>}
      {results && results.length === 0 && <p className="text-ink-muted">No completed sessions yet.</p>}
      <ul className="space-y-2">
        {results?.map((result) => (
          <li key={result.sessionId} className="rounded-panel border border-edge bg-surface p-3">
            <p className="text-sm">{new Date(result.endedAt).toLocaleString()}</p>
            <p className="text-sm text-ink-muted">
              {result.totalSetsCompleted}/{result.totalSetsPlanned} sets — {result.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/screens/ProgressScreen.tsx
git commit -m "feat: add Progress screen"
```

---

### Task 10: Settings screen (theme, motion, export/import)

**Files:**
- Create: `src/presentation/screens/SettingsScreen.tsx`
- Modify: `src/infrastructure/exportImport/exportImport.ts`
- Modify: `src/infrastructure/exportImport/exportImport.test.ts`

**Interfaces:**
- Consumes: `useTheme` from Task 3; `exportAll`, `importAll` from `infrastructure/exportImport/exportImport`
- Produces: `SettingsScreen`; a new `isValidExportBundle(value: unknown): value is ExportBundle` guard exported from `exportImport.ts` — consumed by `SettingsScreen` before ever calling `importAll` on untrusted file content

**Why this task touches an already-merged previous-plan file:** the previous plan's final review explicitly flagged that `importAll` trusts its input's shape with no runtime validation, and its own addendum said this "needs hardening before any real Settings-screen 'Import' button calls it on a live database." This task is that exact button. Shipping it without the validation the previous review called for would repeat a known, already-identified defect — so this closes that gap rather than deferring it again. (Full atomicity/clear-before-restore hardening is still out of scope here — that's a larger redesign the previous review recommended bundling with other persistence-layer work in a future pass; this step only stops obviously-malformed JSON from being written into IndexedDB at all.)

- [ ] **Step 1: Write the failing test for the new validation guard**

Add this test to the existing `describe('exportAll / importAll', ...)` block in `src/infrastructure/exportImport/exportImport.test.ts` (the file already has `db` and the `plan` fixture from the previous plan — reuse them, don't redefine):

```ts
  it('isValidExportBundle rejects structurally malformed input without throwing', async () => {
    const { isValidExportBundle } = await import('./exportImport')
    expect(isValidExportBundle(null)).toBe(false)
    expect(isValidExportBundle('not an object')).toBe(false)
    expect(isValidExportBundle({})).toBe(false)
    expect(isValidExportBundle({ version: 1 })).toBe(false)
    const validShape = await exportAll()
    expect(isValidExportBundle(validShape)).toBe(true)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/infrastructure/exportImport/exportImport.test.ts`
Expected: FAIL — `isValidExportBundle` isn't exported yet.

- [ ] **Step 3: Add the guard to `exportImport.ts`**

Add this function to `src/infrastructure/exportImport/exportImport.ts`, alongside the existing `exportAll`/`importAll` (don't change those two functions' own bodies in this step):

```ts
const EXPORT_BUNDLE_ARRAY_FIELDS = [
  'settings',
  'checkIns',
  'sessionPlans',
  'sessionEvents',
  'sessionResults',
  'familiarity',
  'progression',
] as const

export function isValidExportBundle(value: unknown): value is ExportBundle {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate.version !== 'number' || typeof candidate.exportedAt !== 'string') {
    return false
  }
  return EXPORT_BUNDLE_ARRAY_FIELDS.every((field) => Array.isArray(candidate[field]))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/infrastructure/exportImport/exportImport.test.ts`
Expected: PASS (4 tests: the 3 pre-existing ones plus this new one).

- [ ] **Step 5: Create `src/presentation/screens/SettingsScreen.tsx`**, using the guard before ever calling `importAll`

```tsx
import { useRef, useState } from 'react'
import { useTheme } from '../theme/ThemeContext'
import { exportAll, importAll, isValidExportBundle } from '../../infrastructure/exportImport/exportImport'

export function SettingsScreen() {
  const { theme, setTheme, motion, setMotion } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handleExport() {
    const bundle = await exportAll()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workout-app-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Export downloaded.')
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      if (!isValidExportBundle(bundle)) {
        setStatus('Import failed — this file is not a valid backup.')
        return
      }
      await importAll(bundle)
      setStatus('Import complete.')
    } catch {
      setStatus('Import failed — check the file and try again.')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-2">
        <p className="font-semibold">Theme</p>
        <div className="flex gap-2">
          <ThemeButton label="Pixel Bloom" active={theme === 'pixel-bloom'} onClick={() => setTheme('pixel-bloom')} />
          <ThemeButton label="Savage Core" active={theme === 'savage-core'} onClick={() => setTheme('savage-core')} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Motion</p>
        <div className="flex gap-2">
          {(['full', 'reduced', 'off'] as const).map((option) => (
            <ThemeButton key={option} label={option} active={motion === option} onClick={() => setMotion(option)} capitalize />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Backup</p>
        <div className="flex gap-2">
          <button className="rounded-panel border border-edge px-4 py-2" onClick={handleExport}>
            Export data
          </button>
          <button className="rounded-panel border border-edge px-4 py-2" onClick={() => fileInputRef.current?.click()}>
            Import data
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleImportFile(file)
          }}
        />
        {status && <p className="text-sm text-ink-muted">{status}</p>}
      </section>
    </div>
  )
}

function ThemeButton({
  label,
  active,
  onClick,
  capitalize,
}: {
  label: string
  active: boolean
  onClick: () => void
  capitalize?: boolean
}) {
  return (
    <button
      className={`rounded-panel border px-3 py-2 ${capitalize ? 'capitalize' : ''} ${
        active ? 'border-primary text-primary' : 'border-edge'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `isValidExportBundle` test from Step 1.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/presentation/screens/SettingsScreen.tsx src/infrastructure/exportImport/exportImport.ts src/infrastructure/exportImport/exportImport.test.ts
git commit -m "feat: add Settings screen with theme, motion, and validated export/import controls"
```

---

### Task 11: PWA installability — wire up the existing manifest and service worker

**Files:**
- Modify: `index.html`
- Create: `src/presentation/pwa/registerServiceWorker.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `public/manifest.json`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png` — all already present and correct in this repo (carried over from the previous prototype's Task 2/final-review work, framework-agnostic, no changes needed to their contents)
- Produces: an installable PWA — this closes the "orphaned legacy PWA files" gap the previous plan's final review flagged (the manifest/service-worker files existed but nothing referenced them)

- [ ] **Step 1: Confirm the existing PWA files are present and correct (no changes needed to their content)**

Run: `cat public/manifest.json public/sw.js && ls public/icons/`
Expected: `manifest.json` has `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, and 2 icon entries; `sw.js` implements network-first navigation caching and cache-on-fetch for same-origin static assets with a versioned `CACHE_NAME`; `icon-192.png` and `icon-512.png` exist. If any of these are missing or different from this description, STOP and report BLOCKED — do not silently recreate them differently, since they were already reviewed/approved in a prior task and should not need re-design.

- [ ] **Step 2: Add the manifest link and theme-color meta tag to `index.html`**

Replace the full contents of `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0a0a0c" />
    <title>Workout App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/presentation/pwa/registerServiceWorker.ts`**

```ts
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the app still works without offline shell caching.
    })
  }
}
```

- [ ] **Step 4: Wire it into `src/main.tsx`**

Replace the full contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './presentation/pwa/registerServiceWorker'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)

registerServiceWorker()
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds. Confirm `dist/manifest.json`, `dist/sw.js`, and `dist/icons/` are present in the build output (Vite copies everything under `public/` as-is).

- [ ] **Step 6: Run the full test suite one final time**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add index.html src/presentation/pwa/registerServiceWorker.ts src/main.tsx
git commit -m "feat: wire up PWA manifest and service worker registration"
```

---

## Post-plan verification (controller, not a task — do after all 11 tasks land)

Per this plan's Testing approach section: do a full manual browser walkthrough of the actual primary flow (Today → check-in → preview → start workout → complete a set → watch the rest timer → skip/pause/resume → finish or end early → Progress shows the result → Library lists the placeholder pack → Settings theme switch actually re-themes the whole app, both directions → export then import round-trips). This is the same verification method already used successfully for this project's screens in the prior (now-legacy) implementation.

## Known gaps this plan does not close (for a future plan)

- **"Adjust Exercise"** (skip/substitute/regress) is deliberately not built — see this plan's Scope decision. Needs REQ-20260913-002's real substitution/regression/skip-policy data first.
- **Real content, real adaptation rules, real theme tokens** are still the same open gaps (`support/CLAUDE_REQUESTS.md` REQ-20260913-001/002/003) — this plan builds the full UI *architecture* against placeholders, which is exactly what makes swapping in real data later a data change, not a redesign.
- **`familiarity`/`progression` repositories** (built in the previous plan) have no UI surface yet — Progress screen only shows session results. Exposing exposure-count-driven "familiarity" guidance and a "Try Next Level?" progression-confirmation flow needs real progression-rule data (same REQ-20260913-002 gap) to mean anything, so it's deferred alongside Adjust Exercise.
- **Deployment**: this plan gets the app installable and running locally (`npm run build` + `npm run preview`, or served from any static file host). Actually deploying it somewhere reachable from a phone (the same self-hosted systemd + Tailscale Serve pattern used for the prior prototype, or any other static host) is a deliberate follow-up step, not part of this plan.
