# Workout App MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working, deployed, mobile-installable PWA that guides a workout session (timer, auto-advance, weight/reps logging) against seeded programs, with history synced to Supabase.

**Architecture:** Next.js 15 App Router, deployed on Vercel. All data access goes through Server Actions using a Supabase service-role client (server-only, never exposed to the browser). No client-side database, no auth. A pure, unit-tested state machine (`lib/session-machine.ts`) drives the active-session flow; a client component wraps it with a countdown timer and calls Server Actions to persist logged sets.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase Postgres, `@supabase/supabase-js`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-workout-app-mvp-design.md`

## Global Constraints

- Next.js 15 (App Router), TypeScript, Tailwind CSS — per spec Architecture section
- Hosting: Vercel; Database: Supabase Postgres
- No `user_id` columns and no auth/login in v1 (single user)
- The browser never holds a Supabase key — all Supabase access happens in Server Actions using the **service role key**, read only from server-side env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, no `NEXT_PUBLIC_` prefix)
- No background/push-notification-driven timers — screen stays on/in-app during a session (v1 constraint, confirmed with user)
- No in-app program/routine builder in v1 — programs are fixed seed data only
- Seed content: two programs — "Push/Pull/Legs" (3 days) and "Full Body" (1 day)

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: a buildable Next.js app skeleton every later task adds to. `app/layout.tsx` and `app/page.tsx` are placeholders overwritten by Task 2 and Task 7 respectively.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "workout-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "2.47.10"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20",
    "eslint": "9.17.0",
    "eslint-config-next": "15.1.0",
    "vitest": "2.1.8",
    "dotenv": "16.4.7"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create placeholder `app/layout.tsx`**

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Create placeholder `app/page.tsx`**

```tsx
export default function HomePage() {
  return <main className="p-4">Workout App — coming soon</main>
}
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules
.next
.env.local
.env.test
supabase/.branches
supabase/.temp
```

- [ ] **Step 10: Install dependencies and verify the build**

Run: `npm install && npm run build`
Expected: build succeeds, prints a route summary including `/`.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs app .gitignore
git commit -m "chore: scaffold Next.js app"
```

---

### Task 2: PWA manifest, icons, and service worker

**Files:**
- Create: `public/manifest.json`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png` (generated)
- Create: `public/icons/icon-512.png` (generated)
- Create: `public/sw.js`
- Create: `components/RegisterServiceWorker.tsx`
- Modify: `app/layout.tsx`
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `RegisterServiceWorker` component, used once from `app/layout.tsx` (already wired here, no other task needs to import it)

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Workout App",
  "short_name": "Workout",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#111111",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Write the failing manifest test**

```ts
// tests/manifest.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PWA manifest', () => {
  it('has the fields Android needs to offer install', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf-8'))
    expect(manifest.name).toBe('Workout App')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toHaveLength(2)
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512'])
    )
  })
})
```

- [ ] **Step 3: Run the test to verify it currently fails or passes trivially**

Run: `npx vitest run tests/manifest.test.ts`
Expected: PASS (the manifest file from Step 1 already satisfies it) — this test now guards against future regressions.

- [ ] **Step 4: Create the icon generator script**

```js
// scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

function crc32(buf) {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makeSolidPng(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[1 + x * 3 + 1] = g
    row[1 + x * 3 + 2] = b
  }
  const raw = Buffer.concat(Array(size).fill(row))
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', makeSolidPng(192, [17, 17, 17]))
writeFileSync('public/icons/icon-512.png', makeSolidPng(512, [17, 17, 17]))
console.log('Generated placeholder icons')
```

- [ ] **Step 5: Run the generator**

Run: `node scripts/generate-icons.mjs`
Expected: prints "Generated placeholder icons"; `public/icons/icon-192.png` and `icon-512.png` exist.

Note: these are solid dark-gray placeholder squares — functionally valid PNGs so Android's install prompt works. Swap in real artwork later; not a blocker for the MVP.

- [ ] **Step 6: Create `public/sw.js`**

```js
const CACHE_NAME = 'workout-app-shell-v1'
const SHELL_URLS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)))
})
```

- [ ] **Step 7: Create `components/RegisterServiceWorker.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: the app still works without offline shell caching.
      })
    }
  }, [])
  return null
}
```

- [ ] **Step 8: Update `app/layout.tsx` to register the manifest and service worker**

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  title: 'Workout App',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Verify the build still passes**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add public scripts components/RegisterServiceWorker.tsx app/layout.tsx tests/manifest.test.ts
git commit -m "feat: add PWA manifest, icons, and offline shell service worker"
```

---

### Task 3: Local Supabase project and schema migration

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/0001_init_schema.sql`
- Create: `tests/setup.ts`
- Create: `vitest.config.ts`
- Modify: `.gitignore` (add `.env.local` already present; no change needed if Task 1 covered it)

**Interfaces:**
- Produces: a running local Supabase instance (Postgres + API) that Task 4 seeds and Tasks 6/9/12 test against. Local API URL and service role key land in `.env.local` (gitignored), read by `lib/supabase/server.ts` (Task 5).

- [ ] **Step 1: Initialize the Supabase project**

Run: `npx supabase init`
Expected: creates `supabase/config.toml` and `supabase/` scaffolding.

- [ ] **Step 2: Start the local Supabase stack**

Run: `npx supabase start`
Expected: pulls/starts Docker containers, then prints `API URL`, `anon key`, and `service_role key`. This takes a few minutes on first run (Docker image pull).

- [ ] **Step 3: Write `.env.local` from the printed output**

Create `.env.local` (not committed — it's in `.gitignore`) with the `API URL` as `SUPABASE_URL` and `service_role key` as `SUPABASE_SERVICE_ROLE_KEY`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<paste the service_role key from `supabase start` output>
```

- [ ] **Step 4: Create the schema migration**

```sql
-- supabase/migrations/0001_init_schema.sql
create table programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  order_index int not null
);

create table program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  exercise_name text not null,
  target_sets int not null,
  target_reps int not null,
  target_rest_seconds int not null,
  order_index int not null
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table logged_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  program_exercise_id uuid not null references program_exercises(id),
  set_number int not null,
  actual_weight numeric,
  actual_reps int,
  completed_at timestamptz not null default now()
);

create index on program_days (program_id);
create index on program_exercises (program_day_id);
create index on sessions (program_day_id);
create index on logged_sets (session_id);
create index on logged_sets (program_exercise_id);
```

- [ ] **Step 5: Apply the migration to the local instance**

Run: `npx supabase migration up`
Expected: reports migration `0001_init_schema` applied.

- [ ] **Step 6: Create `vitest.config.ts`**

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
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 7: Create `tests/setup.ts`**

```ts
import { config } from 'dotenv'

config({ path: '.env.local' })
```

- [ ] **Step 8: Write a test confirming the schema is live**

```ts
// tests/schema.test.ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

describe('local Supabase schema', () => {
  it('has the five MVP tables reachable', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    for (const table of ['programs', 'program_days', 'program_exercises', 'sessions', 'logged_sets']) {
      const { error } = await supabase.from(table).select('id').limit(1)
      expect(error, `table ${table} should be queryable`).toBeNull()
    }
  })
})
```

- [ ] **Step 9: Run the test**

Run: `npx vitest run tests/schema.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase/config.toml supabase/migrations vitest.config.ts tests/setup.ts tests/schema.test.ts
git commit -m "feat: add Supabase schema migration and local test harness"
```

Note: `supabase/config.toml` and migrations are committed; `.env.local` (the secret) is not.

---

### Task 4: Seed data migration

**Files:**
- Create: `supabase/migrations/0002_seed_programs.sql`
- Test: `tests/seed.test.ts`

**Interfaces:**
- Consumes: schema from Task 3
- Produces: two seeded programs ("Push/Pull/Legs", "Full Body") that Task 6's `getPrograms`/`getProgramDays` read

- [ ] **Step 1: Write the failing seed test**

```ts
// tests/seed.test.ts
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

describe('seeded programs', () => {
  it('includes Push/Pull/Legs and Full Body with exercises', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: programs, error } = await supabase.from('programs').select('name')
    expect(error).toBeNull()
    const names = programs!.map((p) => p.name)
    expect(names).toEqual(expect.arrayContaining(['Push/Pull/Legs', 'Full Body']))

    const { data: exercises, error: exError } = await supabase
      .from('program_exercises')
      .select('id')
    expect(exError).toBeNull()
    expect(exercises!.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL — `names` is empty (no seed data yet).

- [ ] **Step 3: Create the seed migration**

```sql
-- supabase/migrations/0002_seed_programs.sql
with ppl as (
  insert into programs (name, description)
  values ('Push/Pull/Legs', 'Classic 3-day split: push, pull, legs')
  returning id
),
push_day as (
  insert into program_days (program_id, name, order_index)
  select id, 'Push Day', 0 from ppl
  returning id
),
pull_day as (
  insert into program_days (program_id, name, order_index)
  select id, 'Pull Day', 1 from ppl
  returning id
),
legs_day as (
  insert into program_days (program_id, name, order_index)
  select id, 'Legs Day', 2 from ppl
  returning id
)
insert into program_exercises (program_day_id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index)
select id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index
from push_day, (values
  ('Bench Press', 4, 8, 120, 0),
  ('Overhead Press', 3, 10, 90, 1),
  ('Incline Dumbbell Press', 3, 10, 90, 2),
  ('Triceps Pushdown', 3, 12, 60, 3)
) as exercises(exercise_name, target_sets, target_reps, target_rest_seconds, order_index)
union all
select id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index
from pull_day, (values
  ('Deadlift', 3, 5, 150, 0),
  ('Pull-Up', 4, 8, 120, 1),
  ('Barbell Row', 3, 10, 90, 2),
  ('Biceps Curl', 3, 12, 60, 3)
) as exercises(exercise_name, target_sets, target_reps, target_rest_seconds, order_index)
union all
select id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index
from legs_day, (values
  ('Back Squat', 4, 8, 150, 0),
  ('Romanian Deadlift', 3, 10, 120, 1),
  ('Leg Press', 3, 12, 90, 2),
  ('Calf Raise', 4, 15, 60, 3)
) as exercises(exercise_name, target_sets, target_reps, target_rest_seconds, order_index);

with fb as (
  insert into programs (name, description)
  values ('Full Body', 'One full-body session, use 3x/week')
  returning id
),
fb_day as (
  insert into program_days (program_id, name, order_index)
  select id, 'Full Body', 0 from fb
  returning id
)
insert into program_exercises (program_day_id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index)
select id, exercise_name, target_sets, target_reps, target_rest_seconds, order_index
from fb_day, (values
  ('Back Squat', 3, 8, 120, 0),
  ('Bench Press', 3, 8, 120, 1),
  ('Barbell Row', 3, 10, 90, 2),
  ('Overhead Press', 3, 10, 90, 3),
  ('Plank', 3, 1, 60, 4)
) as exercises(exercise_name, target_sets, target_reps, target_rest_seconds, order_index);
```

- [ ] **Step 4: Apply it**

Run: `npx supabase migration up`
Expected: reports `0002_seed_programs` applied.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/seed.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_seed_programs.sql tests/seed.test.ts
git commit -m "feat: seed Push/Pull/Legs and Full Body programs"
```

---

### Task 5: Shared types and Supabase server client

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars (Task 3)
- Produces: `createServiceClient(): SupabaseClient` and the `Program`, `ProgramDay`, `ProgramExercise`, `Session`, `LoggedSet`, `ProgramDayWithExercises` types — consumed by every Server Action task (6, 9, 12)

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type Program = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type ProgramDay = {
  id: string
  program_id: string
  name: string
  order_index: number
}

export type ProgramExercise = {
  id: string
  program_day_id: string
  exercise_name: string
  target_sets: number
  target_reps: number
  target_rest_seconds: number
  order_index: number
}

export type Session = {
  id: string
  program_day_id: string
  started_at: string
  ended_at: string | null
}

export type LoggedSet = {
  id: string
  session_id: string
  program_exercise_id: string
  set_number: number
  actual_weight: number | null
  actual_reps: number | null
  completed_at: string
}

export type ProgramDayWithExercises = ProgramDay & {
  exercises: ProgramExercise[]
}
```

- [ ] **Step 2: Create `lib/supabase/server.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds (these files aren't wired into any route yet, but must type-check).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/supabase/server.ts
git commit -m "feat: add shared types and Supabase service-role client"
```

---

### Task 6: Server Actions — programs

**Files:**
- Create: `lib/actions/programs.ts`
- Test: `tests/actions/programs.test.ts`

**Interfaces:**
- Consumes: `createServiceClient` and types from Task 5; seeded data from Task 4
- Produces: `getPrograms(): Promise<Program[]>`, `getProgramDays(programId: string): Promise<ProgramDayWithExercises[]>`, `getProgramDay(programDayId: string): Promise<ProgramDayWithExercises>` — consumed by Task 7 (Home/Program pages), Task 9 (session start), Task 11 (session page)

- [ ] **Step 1: Write the failing test**

```ts
// tests/actions/programs.test.ts
import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays, getProgramDay } from '@/lib/actions/programs'

describe('program actions', () => {
  it('lists seeded programs', async () => {
    const programs = await getPrograms()
    expect(programs.map((p) => p.name)).toEqual(expect.arrayContaining(['Push/Pull/Legs', 'Full Body']))
  })

  it('lists days with exercises for a program', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    expect(days).toHaveLength(3)
    expect(days.map((d) => d.name)).toEqual(['Push Day', 'Pull Day', 'Legs Day'])
    expect(days[0].exercises.length).toBeGreaterThan(0)
  })

  it('loads a single day with its exercises', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const day = await getProgramDay(days[0].id)
    expect(day.name).toBe('Push Day')
    expect(day.exercises[0].exercise_name).toBe('Bench Press')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/actions/programs.test.ts`
Expected: FAIL — `Cannot find module '@/lib/actions/programs'`.

- [ ] **Step 3: Implement `lib/actions/programs.ts`**

```ts
'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { Program, ProgramDayWithExercises } from '@/lib/types'

export async function getPrograms(): Promise<Program[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('programs').select('*').order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to load programs: ${error.message}`)
  return data
}

export async function getProgramDays(programId: string): Promise<ProgramDayWithExercises[]> {
  const supabase = createServiceClient()
  const { data: days, error: daysError } = await supabase
    .from('program_days')
    .select('*')
    .eq('program_id', programId)
    .order('order_index', { ascending: true })
  if (daysError) throw new Error(`Failed to load program days: ${daysError.message}`)
  if (days.length === 0) return []

  const { data: exercises, error: exercisesError } = await supabase
    .from('program_exercises')
    .select('*')
    .in('program_day_id', days.map((d) => d.id))
    .order('order_index', { ascending: true })
  if (exercisesError) throw new Error(`Failed to load exercises: ${exercisesError.message}`)

  return days.map((day) => ({
    ...day,
    exercises: exercises.filter((e) => e.program_day_id === day.id),
  }))
}

export async function getProgramDay(programDayId: string): Promise<ProgramDayWithExercises> {
  const supabase = createServiceClient()
  const { data: day, error: dayError } = await supabase
    .from('program_days')
    .select('*')
    .eq('id', programDayId)
    .single()
  if (dayError) throw new Error(`Failed to load program day: ${dayError.message}`)

  const { data: exercises, error: exercisesError } = await supabase
    .from('program_exercises')
    .select('*')
    .eq('program_day_id', programDayId)
    .order('order_index', { ascending: true })
  if (exercisesError) throw new Error(`Failed to load exercises: ${exercisesError.message}`)

  return { ...day, exercises }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/actions/programs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/programs.ts tests/actions/programs.test.ts
git commit -m "feat: add program server actions"
```

---

### Task 7: Home page and program detail page

**Files:**
- Modify: `app/page.tsx`
- Create: `app/programs/[programId]/page.tsx`

**Interfaces:**
- Consumes: `getPrograms`, `getProgramDays` from Task 6; `startSessionAndRedirect` from Task 9 (this task's program page imports it — implement Task 9 first, or stub it here and wire the import once Task 9 lands; this plan sequences Task 9 after Task 7, so **swap order**: do Task 9 before writing the program page's "Start Workout" button. See Step 3 note.)

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { getPrograms } from '@/lib/actions/programs'

export default async function HomePage() {
  const programs = await getPrograms()
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Workout App</h1>
      <ul className="space-y-2">
        {programs.map((program) => (
          <li key={program.id}>
            <Link href={`/programs/${program.id}`} className="block rounded border p-4">
              <p className="font-semibold">{program.name}</p>
              {program.description && <p className="text-sm text-gray-500">{program.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/history" className="block text-sm underline">
        View history
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Verify the build (program page not yet created)**

Run: `npm run build`
Expected: succeeds — `app/page.tsx` only depends on Task 6, already implemented.

- [ ] **Step 3: Commit the home page on its own**

```bash
git add app/page.tsx
git commit -m "feat: build home page listing seeded programs"
```

Note: `app/programs/[programId]/page.tsx` needs `startSessionAndRedirect`, which Task 9 creates. Its creation is deferred to the end of Task 9 (Step 6 there) rather than here, so each task's diff stays self-contained and buildable.

---

### Task 8: Session state machine (pure logic)

**Files:**
- Create: `lib/session-machine.ts`
- Test: `lib/session-machine.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no I/O)
- Produces: `SessionPlan`, `MachineExercise`, `SessionState` (`ActiveSetState | RestingState | SessionCompleteState`) types, and `initSession(plan)`, `completeSet(plan, state)`, `restComplete(state)`, `skipRest(state)`, `goBack(state)` functions — consumed by Task 11's `ActiveSessionClient`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/session-machine.test.ts
import { describe, expect, it } from 'vitest'
import { completeSet, goBack, initSession, restComplete, skipRest, type SessionPlan } from './session-machine'

const plan: SessionPlan = {
  exercises: [
    { id: 'ex1', name: 'Bench Press', targetSets: 2, targetReps: 8, targetRestSeconds: 90 },
    { id: 'ex2', name: 'Overhead Press', targetSets: 1, targetReps: 10, targetRestSeconds: 60 },
  ],
}

describe('session machine', () => {
  it('starts at set 1 of exercise 0', () => {
    expect(initSession(plan)).toEqual({ phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
  })

  it('starts session_complete for an empty plan', () => {
    expect(initSession({ exercises: [] })).toEqual({ phase: 'session_complete' })
  })

  it('moves to resting after a non-final set, targeting the next set of the same exercise', () => {
    const state = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    expect(state).toEqual({
      phase: 'resting',
      exerciseIndex: 0,
      setNumber: 1,
      restSeconds: 90,
      nextExerciseIndex: 0,
      nextSetNumber: 2,
    })
  })

  it('restComplete advances to the targeted next set', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    expect(resting.phase).toBe('resting')
    const next = restComplete(resting as Extract<typeof resting, { phase: 'resting' }>)
    expect(next).toEqual({ phase: 'active_set', exerciseIndex: 0, setNumber: 2 })
  })

  it('skipRest behaves the same as restComplete', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    const viaSkip = skipRest(resting as Extract<typeof resting, { phase: 'resting' }>)
    const viaComplete = restComplete(resting as Extract<typeof resting, { phase: 'resting' }>)
    expect(viaSkip).toEqual(viaComplete)
  })

  it('moves to the next exercise after the last set of the current one', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 2 })
    expect(resting).toEqual({
      phase: 'resting',
      exerciseIndex: 0,
      setNumber: 2,
      restSeconds: 90,
      nextExerciseIndex: 1,
      nextSetNumber: 1,
    })
  })

  it('completes the session after the last set of the last exercise', () => {
    const state = completeSet(plan, { phase: 'active_set', exerciseIndex: 1, setNumber: 1 })
    expect(state).toEqual({ phase: 'session_complete' })
  })

  it('goBack moves to the previous set within an exercise', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 0, setNumber: 2 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack from set 1 of a later exercise drops to set 1 of the previous exercise', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 1, setNumber: 1 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack is a no-op at the very start', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 0, setNumber: 1 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack is a no-op once the session is complete', () => {
    expect(goBack({ phase: 'session_complete' })).toEqual({ phase: 'session_complete' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/session-machine.test.ts`
Expected: FAIL — `Cannot find module './session-machine'`.

- [ ] **Step 3: Implement `lib/session-machine.ts`**

```ts
export type MachineExercise = {
  id: string
  name: string
  targetSets: number
  targetReps: number
  targetRestSeconds: number
}

export type SessionPlan = {
  exercises: MachineExercise[]
}

export type ActiveSetState = {
  phase: 'active_set'
  exerciseIndex: number
  setNumber: number
}

export type RestingState = {
  phase: 'resting'
  exerciseIndex: number
  setNumber: number
  restSeconds: number
  nextExerciseIndex: number
  nextSetNumber: number
}

export type SessionCompleteState = {
  phase: 'session_complete'
}

export type SessionState = ActiveSetState | RestingState | SessionCompleteState

export function initSession(plan: SessionPlan): SessionState {
  if (plan.exercises.length === 0) {
    return { phase: 'session_complete' }
  }
  return { phase: 'active_set', exerciseIndex: 0, setNumber: 1 }
}

function nextPointer(
  plan: SessionPlan,
  exerciseIndex: number,
  setNumber: number
): { exerciseIndex: number; setNumber: number } | null {
  const exercise = plan.exercises[exerciseIndex]
  if (setNumber < exercise.targetSets) {
    return { exerciseIndex, setNumber: setNumber + 1 }
  }
  if (exerciseIndex + 1 < plan.exercises.length) {
    return { exerciseIndex: exerciseIndex + 1, setNumber: 1 }
  }
  return null
}

export function completeSet(plan: SessionPlan, state: ActiveSetState): SessionState {
  const next = nextPointer(plan, state.exerciseIndex, state.setNumber)
  if (next === null) {
    return { phase: 'session_complete' }
  }
  const restSeconds = plan.exercises[state.exerciseIndex].targetRestSeconds
  return {
    phase: 'resting',
    exerciseIndex: state.exerciseIndex,
    setNumber: state.setNumber,
    restSeconds,
    nextExerciseIndex: next.exerciseIndex,
    nextSetNumber: next.setNumber,
  }
}

export function restComplete(state: RestingState): SessionState {
  return { phase: 'active_set', exerciseIndex: state.nextExerciseIndex, setNumber: state.nextSetNumber }
}

export function skipRest(state: RestingState): SessionState {
  return restComplete(state)
}

function prevPointer(exerciseIndex: number, setNumber: number): { exerciseIndex: number; setNumber: number } {
  if (setNumber > 1) {
    return { exerciseIndex, setNumber: setNumber - 1 }
  }
  if (exerciseIndex > 0) {
    return { exerciseIndex: exerciseIndex - 1, setNumber: 1 }
  }
  return { exerciseIndex: 0, setNumber: 1 }
}

export function goBack(state: SessionState): SessionState {
  if (state.phase === 'session_complete') {
    return state
  }
  const prev = prevPointer(state.exerciseIndex, state.setNumber)
  return { phase: 'active_set', exerciseIndex: prev.exerciseIndex, setNumber: prev.setNumber }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/session-machine.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/session-machine.ts lib/session-machine.test.ts
git commit -m "feat: add session state machine with full transition coverage"
```

---

### Task 9: Server Actions — sessions and sets

**Files:**
- Create: `lib/actions/sessions.ts`
- Create: `lib/actions/sets.ts`
- Create: `app/programs/[programId]/page.tsx` (deferred from Task 7 — needs `startSessionAndRedirect` from this task)
- Test: `tests/actions/sessions.test.ts`

**Interfaces:**
- Consumes: `createServiceClient`, types from Task 5; `getProgramDays` from Task 6 (for the program page)
- Produces: `startSession(programDayId): Promise<Session>`, `startSessionAndRedirect(programDayId): Promise<never>`, `endSession(sessionId): Promise<void>`, `getSession(sessionId): Promise<Session>`, `getLoggedSets(sessionId): Promise<LoggedSet[]>`, `logSet(input: LogSetInput): Promise<LoggedSet>` — consumed by Task 11 (active session page) and Task 13 (history pages)

- [ ] **Step 1: Write the failing test**

```ts
// tests/actions/sessions.test.ts
import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays } from '@/lib/actions/programs'
import { startSession, endSession, getSession, getLoggedSets } from '@/lib/actions/sessions'
import { logSet } from '@/lib/actions/sets'

describe('session and set actions', () => {
  it('starts a session, logs a set, and ends the session', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const pushDay = days[0]

    const session = await startSession(pushDay.id)
    expect(session.program_day_id).toBe(pushDay.id)
    expect(session.ended_at).toBeNull()

    const exercise = pushDay.exercises[0]
    const loggedSet = await logSet({
      sessionId: session.id,
      programExerciseId: exercise.id,
      setNumber: 1,
      actualWeight: 135,
      actualReps: 8,
    })
    expect(loggedSet.actual_weight).toBe(135)
    expect(loggedSet.actual_reps).toBe(8)

    const sets = await getLoggedSets(session.id)
    expect(sets).toHaveLength(1)

    await endSession(session.id)
    const ended = await getSession(session.id)
    expect(ended.ended_at).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/actions/sessions.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement `lib/actions/sessions.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import type { Session, LoggedSet } from '@/lib/types'

export async function startSession(programDayId: string): Promise<Session> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({ program_day_id: programDayId, started_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error(`Failed to start session: ${error.message}`)
  return data
}

export async function startSessionAndRedirect(programDayId: string): Promise<never> {
  const session = await startSession(programDayId)
  redirect(`/session/${session.id}`)
}

export async function endSession(sessionId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw new Error(`Failed to end session: ${error.message}`)
}

export async function getSession(sessionId: string): Promise<Session> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
  if (error) throw new Error(`Failed to load session: ${error.message}`)
  return data
}

export async function getLoggedSets(sessionId: string): Promise<LoggedSet[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('logged_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('completed_at', { ascending: true })
  if (error) throw new Error(`Failed to load logged sets: ${error.message}`)
  return data
}
```

- [ ] **Step 4: Implement `lib/actions/sets.ts`**

```ts
'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { LoggedSet } from '@/lib/types'

export type LogSetInput = {
  sessionId: string
  programExerciseId: string
  setNumber: number
  actualWeight: number | null
  actualReps: number | null
}

export async function logSet(input: LogSetInput): Promise<LoggedSet> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('logged_sets')
    .insert({
      session_id: input.sessionId,
      program_exercise_id: input.programExerciseId,
      set_number: input.setNumber,
      actual_weight: input.actualWeight,
      actual_reps: input.actualReps,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to log set: ${error.message}`)
  return data
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/actions/sessions.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `app/programs/[programId]/page.tsx`**

```tsx
import { getProgramDays } from '@/lib/actions/programs'
import { startSessionAndRedirect } from '@/lib/actions/sessions'

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = await params
  const days = await getProgramDays(programId)

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Program</h1>
      <ul className="space-y-4">
        {days.map((day) => (
          <li key={day.id} className="rounded border p-4 space-y-2">
            <p className="font-semibold">{day.name}</p>
            <ul className="text-sm text-gray-500">
              {day.exercises.map((e) => (
                <li key={e.id}>
                  {e.exercise_name} — {e.target_sets}x{e.target_reps}
                </li>
              ))}
            </ul>
            <form action={startSessionAndRedirect.bind(null, day.id)}>
              <button className="rounded bg-black px-4 py-2 text-white" type="submit">
                Start Workout
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds. `/session/[sessionId]` doesn't exist yet (Task 11), so the redirect target 404s until then — acceptable mid-plan state, not user-facing yet.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/sessions.ts lib/actions/sets.ts app/programs tests/actions/sessions.test.ts
git commit -m "feat: add session/set server actions and program detail page"
```

---

### Task 10: Timer component

**Files:**
- Create: `components/session/Timer.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (self-contained client component)
- Produces: `<Timer durationSeconds={number} onComplete={() => void} />` — consumed by Task 11's `ActiveSessionClient`

- [ ] **Step 1: Create `components/session/Timer.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type TimerProps = {
  durationSeconds: number
  onComplete: () => void
}

export function Timer({ durationSeconds, onComplete }: TimerProps) {
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000)
  const endAtRef = useRef(Date.now() + durationSeconds * 1000)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    endAtRef.current = Date.now() + durationSeconds * 1000
    setRemainingMs(durationSeconds * 1000)

    const interval = setInterval(() => {
      const remaining = endAtRef.current - Date.now()
      if (remaining <= 0) {
        setRemainingMs(0)
        clearInterval(interval)
        playAlertSound()
        if (navigator.vibrate) navigator.vibrate(400)
        onCompleteRef.current()
      } else {
        setRemainingMs(remaining)
      }
    }, 250)

    return () => clearInterval(interval)
  }, [durationSeconds])

  const seconds = Math.ceil(remainingMs / 1000)
  return (
    <div className="text-6xl font-bold tabular-nums text-center" role="timer">
      {formatTime(seconds)}
    </div>
  )
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    oscillator.frequency.value = 880
    oscillator.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not available; vibration/visual state is enough.
  }
}
```

The countdown is computed from a fixed `endAtRef` timestamp on every tick (not decremented per-tick), so brief tab throttling doesn't desync the displayed time from wall-clock reality.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: succeeds (component isn't imported anywhere yet, but must type-check).

- [ ] **Step 3: Commit**

```bash
git add components/session/Timer.tsx
git commit -m "feat: add rest timer component with sound and vibration alert"
```

---

### Task 11: Active session page

**Files:**
- Create: `components/session/ActiveSessionClient.tsx`
- Create: `app/session/[sessionId]/page.tsx`

**Interfaces:**
- Consumes: `SessionPlan`, `SessionState`, `initSession`, `completeSet`, `restComplete`, `skipRest`, `goBack` from Task 8; `Timer` from Task 10; `logSet` from Task 9; `endSession`, `getSession` from Task 9; `getProgramDay` from Task 6
- Produces: the `/session/[sessionId]` route that `startSessionAndRedirect` (Task 9) sends users to

- [ ] **Step 1: Create `components/session/ActiveSessionClient.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Timer } from '@/components/session/Timer'
import {
  completeSet,
  goBack,
  initSession,
  restComplete,
  skipRest,
  type SessionPlan,
  type SessionState,
} from '@/lib/session-machine'
import { logSet } from '@/lib/actions/sets'
import { endSession } from '@/lib/actions/sessions'

type Props = {
  sessionId: string
  plan: SessionPlan
}

export function ActiveSessionClient({ sessionId, plan }: Props) {
  const [state, setState] = useState<SessionState>(() => initSession(plan))
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [isPending, startTransition] = useTransition()

  if (state.phase === 'session_complete') {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-xl font-semibold">Workout complete</p>
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() => startTransition(() => endSession(sessionId))}
          disabled={isPending}
        >
          Finish
        </button>
      </div>
    )
  }

  if (state.phase === 'resting') {
    return (
      <div className="p-6 space-y-6 text-center">
        <p className="text-lg">Rest</p>
        <Timer durationSeconds={state.restSeconds} onComplete={() => setState(restComplete(state))} />
        <button className="rounded border px-4 py-2" onClick={() => setState(skipRest(state))}>
          Skip rest
        </button>
      </div>
    )
  }

  const exercise = plan.exercises[state.exerciseIndex]

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-500">
        Exercise {state.exerciseIndex + 1} of {plan.exercises.length}
      </p>
      <h2 className="text-2xl font-bold">{exercise.name}</h2>
      <p>
        Set {state.setNumber} of {exercise.targetSets} — target {exercise.targetReps} reps
      </p>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 w-24"
          type="number"
          inputMode="decimal"
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 w-24"
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="rounded border px-4 py-2" onClick={() => setState(goBack(state))} disabled={isPending}>
          Back
        </button>
        <button
          className="rounded bg-black px-4 py-2 text-white"
          disabled={isPending}
          onClick={() => {
            const actualWeight = weight === '' ? null : Number(weight)
            const actualReps = reps === '' ? null : Number(reps)
            const currentState = state
            startTransition(async () => {
              await logSet({
                sessionId,
                programExerciseId: exercise.id,
                setNumber: currentState.setNumber,
                actualWeight,
                actualReps,
              })
              setWeight('')
              setReps('')
              setState(completeSet(plan, currentState))
            })
          }}
        >
          Log set
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/session/[sessionId]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/actions/sessions'
import { getProgramDay } from '@/lib/actions/programs'
import { ActiveSessionClient } from '@/components/session/ActiveSessionClient'
import type { SessionPlan } from '@/lib/session-machine'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const session = await getSession(sessionId).catch(() => null)
  if (!session) notFound()

  const day = await getProgramDay(session.program_day_id)
  const plan: SessionPlan = {
    exercises: day.exercises.map((e) => ({
      id: e.id,
      name: e.exercise_name,
      targetSets: e.target_sets,
      targetReps: e.target_reps,
      targetRestSeconds: e.target_rest_seconds,
    })),
  }

  return (
    <main>
      <h1 className="p-4 text-lg font-semibold">{day.name}</h1>
      <ActiveSessionClient sessionId={sessionId} plan={plan} />
    </main>
  )
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open `http://localhost:3000`, click into "Push/Pull/Legs" → "Push Day" → "Start Workout". Confirm: current exercise and set number display, "Log set" advances to a rest countdown, the countdown reaches 0 and auto-advances to the next set, and "Back" moves to the previous set. Complete the whole day and confirm "Workout complete" appears.

- [ ] **Step 5: Commit**

```bash
git add components/session/ActiveSessionClient.tsx app/session
git commit -m "feat: wire up guided active-session flow with timer and logging"
```

---

### Task 12: Server Actions — history

**Files:**
- Create: `lib/actions/history.ts`
- Test: `tests/actions/history.test.ts`

**Interfaces:**
- Consumes: `createServiceClient` from Task 5; data written by Task 9's actions
- Produces: `SessionSummary`, `getHistory(): Promise<SessionSummary[]>`, `ExerciseHistoryPoint`, `getExerciseHistory(exerciseName: string): Promise<ExerciseHistoryPoint[]>` — consumed by Task 13's history pages

- [ ] **Step 1: Write the failing test**

```ts
// tests/actions/history.test.ts
import { describe, expect, it } from 'vitest'
import { getPrograms, getProgramDays } from '@/lib/actions/programs'
import { startSession, endSession } from '@/lib/actions/sessions'
import { logSet } from '@/lib/actions/sets'
import { getHistory, getExerciseHistory } from '@/lib/actions/history'

describe('history actions', () => {
  it('summarizes a completed session and tracks per-exercise history', async () => {
    const programs = await getPrograms()
    const ppl = programs.find((p) => p.name === 'Push/Pull/Legs')!
    const days = await getProgramDays(ppl.id)
    const pushDay = days[0]
    const benchPress = pushDay.exercises.find((e) => e.exercise_name === 'Bench Press')!

    const session = await startSession(pushDay.id)
    await logSet({
      sessionId: session.id,
      programExerciseId: benchPress.id,
      setNumber: 1,
      actualWeight: 140,
      actualReps: 8,
    })
    await endSession(session.id)

    const history = await getHistory()
    const summary = history.find((h) => h.id === session.id)!
    expect(summary.programDayName).toBe('Push Day')
    expect(summary.totalSetsLogged).toBeGreaterThanOrEqual(1)

    const points = await getExerciseHistory('Bench Press')
    expect(points.some((p) => p.actualWeight === 140)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/actions/history.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `lib/actions/history.ts`**

```ts
'use server'

import { createServiceClient } from '@/lib/supabase/server'

export type SessionSummary = {
  id: string
  programDayName: string
  startedAt: string
  endedAt: string | null
  totalSetsLogged: number
}

export async function getHistory(): Promise<SessionSummary[]> {
  const supabase = createServiceClient()
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, program_day_id, program_days(name)')
    .order('started_at', { ascending: false })
  if (error) throw new Error(`Failed to load history: ${error.message}`)

  const { data: sets, error: setsError } = await supabase.from('logged_sets').select('session_id')
  if (setsError) throw new Error(`Failed to load logged sets: ${setsError.message}`)

  const countsBySession = new Map<string, number>()
  for (const s of sets) {
    countsBySession.set(s.session_id, (countsBySession.get(s.session_id) ?? 0) + 1)
  }

  return sessions.map((s) => {
    const day = s.program_days as unknown as { name: string } | null
    return {
      id: s.id,
      programDayName: day?.name ?? 'Unknown',
      startedAt: s.started_at,
      endedAt: s.ended_at,
      totalSetsLogged: countsBySession.get(s.id) ?? 0,
    }
  })
}

export type ExerciseHistoryPoint = {
  completedAt: string
  actualWeight: number | null
  actualReps: number | null
}

export async function getExerciseHistory(exerciseName: string): Promise<ExerciseHistoryPoint[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('logged_sets')
    .select('completed_at, actual_weight, actual_reps, program_exercises!inner(exercise_name)')
    .eq('program_exercises.exercise_name', exerciseName)
    .order('completed_at', { ascending: true })
  if (error) throw new Error(`Failed to load exercise history: ${error.message}`)

  return data.map((d) => ({
    completedAt: d.completed_at,
    actualWeight: d.actual_weight,
    actualReps: d.actual_reps,
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/actions/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/history.ts tests/actions/history.test.ts
git commit -m "feat: add history server actions"
```

---

### Task 13: History pages

**Files:**
- Create: `app/history/page.tsx`
- Create: `app/history/[sessionId]/page.tsx`
- Create: `app/history/exercise/[exerciseName]/page.tsx`

**Interfaces:**
- Consumes: `getHistory`, `getExerciseHistory` from Task 12; `getSession`, `getLoggedSets` from Task 9; `getProgramDay` from Task 6

- [ ] **Step 1: Create `app/history/page.tsx`**

```tsx
import Link from 'next/link'
import { getHistory } from '@/lib/actions/history'

export default async function HistoryPage() {
  const sessions = await getHistory()
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">History</h1>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link href={`/history/${s.id}`} className="block rounded border p-4">
              <p className="font-semibold">{s.programDayName}</p>
              <p className="text-sm text-gray-500">
                {new Date(s.startedAt).toLocaleString()} — {s.totalSetsLogged} sets
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/history/[sessionId]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession, getLoggedSets } from '@/lib/actions/sessions'
import { getProgramDay } from '@/lib/actions/programs'

export default async function SessionHistoryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const session = await getSession(sessionId).catch(() => null)
  if (!session) notFound()

  const [day, sets] = await Promise.all([getProgramDay(session.program_day_id), getLoggedSets(sessionId)])
  const exerciseById = new Map(day.exercises.map((e) => [e.id, e]))

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{day.name}</h1>
      <p className="text-sm text-gray-500">{new Date(session.started_at).toLocaleString()}</p>
      <ul className="space-y-1">
        {sets.map((set) => {
          const exercise = exerciseById.get(set.program_exercise_id)
          return (
            <li key={set.id} className="text-sm">
              {exercise ? (
                <Link href={`/history/exercise/${encodeURIComponent(exercise.exercise_name)}`} className="underline">
                  {exercise.exercise_name}
                </Link>
              ) : (
                'Exercise'
              )}{' '}
              — set {set.set_number}: {set.actual_weight ?? '-'} lb x {set.actual_reps ?? '-'}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: Create `app/history/exercise/[exerciseName]/page.tsx`**

```tsx
import { getExerciseHistory } from '@/lib/actions/history'

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseName: string }>
}) {
  const { exerciseName } = await params
  const decodedName = decodeURIComponent(exerciseName)
  const points = await getExerciseHistory(decodedName)

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{decodedName}</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th>Date</th>
            <th>Weight</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{new Date(p.completedAt).toLocaleDateString()}</td>
              <td>{p.actualWeight ?? '-'}</td>
              <td>{p.actualReps ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual smoke test**

With `npm run dev` running, complete a workout (Task 11's flow) with a couple of logged sets, then visit `/history`, click into the session, and click an exercise name to see its progress table.

- [ ] **Step 6: Commit**

```bash
git add app/history
git commit -m "feat: add history list, session detail, and per-exercise progress pages"
```

---

### Task 14: Provision the hosted Supabase project

**Files:** none (infrastructure step — Supabase project + applying existing migrations)

**Interfaces:**
- Consumes: `supabase/migrations/0001_init_schema.sql` and `0002_seed_programs.sql` from Tasks 3–4
- Produces: a hosted Supabase project URL + service role key, used by Task 15's Vercel env vars

- [ ] **Step 1: Create the hosted Supabase project**

Use the `mcp__claude_ai_Supabase__create_project` tool (name: `workout-app`, pick an existing organization via `mcp__claude_ai_Supabase__list_organizations`). Confirm cost if prompted via `mcp__claude_ai_Supabase__confirm_cost`.

- [ ] **Step 2: Apply both migrations to the hosted project**

Use `mcp__claude_ai_Supabase__apply_migration` twice, once with the contents of `supabase/migrations/0001_init_schema.sql` (name `init_schema`), once with `0002_seed_programs.sql` (name `seed_programs`).

- [ ] **Step 3: Verify the hosted schema**

Use `mcp__claude_ai_Supabase__list_tables` to confirm `programs`, `program_days`, `program_exercises`, `sessions`, `logged_sets` all exist, and `mcp__claude_ai_Supabase__execute_sql` with `select count(*) from programs;` to confirm it returns 2.

- [ ] **Step 4: Get the project URL**

Use `mcp__claude_ai_Supabase__get_project_url` — save this for Task 15's `SUPABASE_URL`.

- [ ] **Step 5: Get the service role key from the user**

The service role key is a secret that bypasses row-level security — it is not returned by the read-only MCP publishable-keys tool. Ask the user to copy it from the Supabase dashboard (Project Settings → API → `service_role` secret) and paste it back for use as `SUPABASE_SERVICE_ROLE_KEY` in Task 15. Do not attempt to fetch or log it any other way.

---

### Task 15: Deploy to Vercel and verify on an Android phone

**Files:** none (deployment step)

**Interfaces:**
- Consumes: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Task 14

- [ ] **Step 1: Set Vercel project env vars**

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Task 14) as Vercel environment variables for the Production environment — via the `vercel:env` skill or `vercel env add`. Do **not** prefix either with `NEXT_PUBLIC_`.

- [ ] **Step 2: Deploy to production**

Use the `vercel:deploy` skill with the "prod" argument (or `vercel --prod` from this directory).

- [ ] **Step 3: Verify the deployment**

Open the deployed URL, confirm the home page lists both seeded programs, and confirm `npx vitest run` still passes locally against the local Supabase instance (hosted and local schemas should match since both come from the same two migrations).

- [ ] **Step 4: Verify on the Android phone**

On the phone, open the deployed URL in Chrome, complete one full guided set (Log set → watch the rest timer auto-advance), then use Chrome's "Add to Home screen" and confirm it launches standalone (no browser chrome) from the home screen icon.

- [ ] **Step 5: Commit any deployment config Vercel generated locally, if applicable**

```bash
git status
```

If Vercel wrote a `.vercel/` directory, leave it untracked (already covered by typical Vercel-generated `.gitignore` entries; add `.vercel` to `.gitignore` if it isn't ignored yet) — it holds local project linkage, not something to commit.

---

## Post-plan (explicitly out of scope, noted in the spec)

In-app routine builder, real auth/multi-user accounts, and background/push-notification-reliable timers are deferred to v2 per the spec's Scope section — no tasks above build them.
