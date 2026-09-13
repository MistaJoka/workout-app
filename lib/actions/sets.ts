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
