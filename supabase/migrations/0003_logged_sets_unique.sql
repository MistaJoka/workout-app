alter table logged_sets
  add constraint logged_sets_session_exercise_set_unique
  unique (session_id, program_exercise_id, set_number);
