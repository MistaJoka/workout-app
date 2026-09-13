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
