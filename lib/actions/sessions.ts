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
