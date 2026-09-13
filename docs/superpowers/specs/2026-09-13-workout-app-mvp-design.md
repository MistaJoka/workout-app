# Workout App MVP — Design Spec

Date: 2026-09-13

## Purpose

A mobile-first, single-user guided workout app. Primary job: drive a
workout session in real time (current exercise, target sets/reps,
rest timer, auto-advance) while logging what was actually done, so
history/progress is available from day one. Installed as a PWA on
Android; no native app store distribution in v1.

## Scope (MVP)

In scope:
- A small set of fixed, seeded workout programs (no in-app builder yet)
- Guided active-session flow: rest timer (sound + vibration), auto-advance
  to next set/exercise, manual skip/back, log actual weight/reps per set
- History view: past sessions, basic per-exercise progress (weight over time)
- Cloud sync of all logs via Supabase (single user, no login/auth)
- Installable PWA (manifest + icons); offline shell caching only —
  **not** background/screen-off timer reliability (screen stays on
  during a session, per user decision)

Out of scope (explicitly deferred):
- In-app routine/program builder (v2)
- Multi-user accounts / real auth (v2, schema should not block it)
- Background-reliable timers via push notifications (v2, if ever needed)
- Social features, sharing, wearable integration

## Architecture

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Hosting:** Vercel
- **Database:** Supabase Postgres
- **Data access:** All writes/reads to Supabase go through Next.js
  Server Actions using the Supabase **service role key**, kept
  server-side only. The browser never talks to Supabase directly and
  never holds a Supabase key — there is no public anon-key write path
  to lock down when auth is added later.
- **PWA:** `manifest.json` + a minimal service worker for offline
  shell/asset caching (via `next-pwa` or a hand-rolled SW). No
  background sync, no push notifications in v1.
- **State:** Server Actions + React state for the active session; no
  separate client-side database (IndexedDB) in v1 — since screen stays
  on/in-app during a session, a lost network mid-set is the only edge
  case, handled by an optimistic local buffer that retries the write
  (not a full offline-first architecture).

## Data model (Supabase tables)

```
programs
  id (uuid, pk)
  name (text)
  description (text)
  created_at (timestamptz)

program_days
  id (uuid, pk)
  program_id (uuid, fk -> programs)
  name (text)              -- e.g. "Push Day"
  order_index (int)

program_exercises
  id (uuid, pk)
  program_day_id (uuid, fk -> program_days)
  exercise_name (text)
  target_sets (int)
  target_reps (int)
  target_rest_seconds (int)
  order_index (int)

sessions
  id (uuid, pk)
  program_day_id (uuid, fk -> program_days)
  started_at (timestamptz)
  ended_at (timestamptz, nullable)

logged_sets
  id (uuid, pk)
  session_id (uuid, fk -> sessions)
  program_exercise_id (uuid, fk -> program_exercises)
  set_number (int)
  actual_weight (numeric, nullable)
  actual_reps (int, nullable)
  completed_at (timestamptz)
```

No `user_id` columns in v1 (single user, no auth). Adding auth later
means adding a `user_id` column + RLS policies — additive, not a
reshape.

## Screens

1. **Home** — list of programs, "Continue last session" shortcut if one
   is in progress, recent session summaries
2. **Program detail** — list of program days, "Start Workout" per day
3. **Active session** (core screen)
   - Current exercise name, target sets/reps, current set number
   - Rest timer: countdown, sound + vibration on completion
   - Auto-advance to next set on timer completion; auto-advance to next
     exercise after last set of current exercise
   - Manual controls: skip rest, go back one step
   - Input for actual weight/reps per completed set, saved immediately
   - "End workout" control (marks session ended_at)
4. **History** — list of past sessions; tapping one shows logged sets;
   simple per-exercise chart/table of weight over time

## Seed content

Two seeded programs to start:
- **Push/Pull/Legs** (3 days)
- **Full Body** (1 day, 3x/week use)

Common compound + accessory exercises with reasonable default
sets/reps/rest. Seeded via a SQL migration, not hardcoded in app code,
so the DB stays the single source of truth.

## Timer / auto-advance logic

This is the trickiest piece and gets dedicated unit tests. Modeled as
an explicit state machine:

```
states: resting -> active_set -> resting -> ... -> exercise_complete -> next_exercise | session_complete
```

- Timer runs client-side (setInterval-driven countdown against a
  target end timestamp, not a naive decrementing counter, so brief tab
  backgrounding doesn't desync the displayed time)
- On timer completion: play sound, trigger vibration (`navigator.vibrate`
  where supported), advance state
- Logging a set's actual weight/reps is decoupled from timer state —
  can happen any time before advancing

## Testing

- Unit tests for the session state machine (timer transitions,
  auto-advance, skip/back) — the highest-risk logic, tested in
  isolation from UI
- Server Action tests against a local Supabase instance (start/seed
  via Supabase CLI) for program fetch, session create, set logging
- Manual mobile-browser (Android Chrome) walkthrough of a full
  start-to-finish session before calling MVP done

## Open questions / risks

- Exact seed exercise list (which lifts, default sets/reps) — will
  pick reasonable defaults during implementation; easy to edit later
  since it's just seed data
- PWA install prompt UX on Android Chrome — implementing to spec,
  will verify manually since this can't be meaningfully unit tested
