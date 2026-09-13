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
