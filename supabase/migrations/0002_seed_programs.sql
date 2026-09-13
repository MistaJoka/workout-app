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
