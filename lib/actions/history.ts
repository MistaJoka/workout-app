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
