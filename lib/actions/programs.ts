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
